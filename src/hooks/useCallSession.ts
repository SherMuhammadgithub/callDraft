"use client";

import { useRef, useCallback, useState, useEffect } from "react";
import { addToast } from "@heroui/react";
import { RealtimeWebRTCClient } from "@/lib/realtimeWebRTC";
import type { TranscriptEntry } from "@/components/TranscriptBubble";

export interface UseCallSessionReturn {
  isConnecting: boolean;
  isConnected: boolean;
  transcript: TranscriptEntry[];
  latency: number;
  callDuration: string;
  startCall: () => Promise<void>;
  endCall: () => void;
  toggleMute: () => void;
  isMuted: boolean;
}

export function useCallSession(): UseCallSessionReturn {
  const clientRef = useRef<RealtimeWebRTCClient | null>(null);
  const requestTimestampRef = useRef<number | null>(null);
  const latencySamplesRef = useRef<number[]>([]);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptSequenceRef = useRef(0);
  // Track which agent responses are "in progress" (not yet done)
  const pendingAgentResponsesRef = useRef<Set<string>>(new Set());

  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [latency, setLatency] = useState(0);
  const [callDuration, setCallDuration] = useState("0:00");

  const setupEventHandlers = useCallback(() => {
    if (!clientRef.current) return;

    let agentTranscriptBuffer: Record<string, string> = {};
    // Store agent entries that arrived before user transcript
    // key = responseId, value = the entry waiting to be sequenced
    let pendingAgentEntries: Record<
      string,
      Omit<TranscriptEntry, "sequence">
    > = {};

    // ✅ User transcript handler
    // When user transcript arrives, insert it THEN flush any pending agent entries after it
    clientRef.current.on(
      "conversation.item.input_audio_transcription.completed",
      (event: any) => {
        const userText = event.transcript;
        if (!userText?.trim()) return;

        const userSequence = transcriptSequenceRef.current++;

        setTranscript((prev) => {
          let updated = [
            ...prev,
            {
              id: `user-${Date.now()}`,
              role: "user" as const,
              text: userText,
              sequence: userSequence,
              timestamp: new Date().toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false,
              }),
            },
          ];

          // Now flush any pending agent entries that were waiting
          const pendingIds = Object.keys(pendingAgentEntries);
          for (const responseId of pendingIds) {
            const entry = pendingAgentEntries[responseId];
            // Check if this entry already exists in transcript
            const exists = updated.find((e) => e.id === entry.id);
            if (!exists) {
              updated = [
                ...updated,
                {
                  ...entry,
                  sequence: transcriptSequenceRef.current++,
                },
              ];
            }
            delete pendingAgentEntries[responseId];
          }

          return updated;
        });
      },
    );

    // Clean up interrupted responses
    clientRef.current.on("response.cancelled", (event: any) => {
      const responseId = event.response_id;
      if (responseId) {
        setTranscript((prev) =>
          prev.filter((e) => e.id !== `agent-${responseId}`),
        );
        delete agentTranscriptBuffer[responseId];
        delete pendingAgentEntries[responseId];
        pendingAgentResponsesRef.current.delete(responseId);
      }
    });

    // Clean up on interruption
    clientRef.current.on("input_audio_buffer.speech_started", () => {
      setTranscript((prev) =>
        prev.filter((e) => {
          if (e.role !== "agent") return true;
          return !agentTranscriptBuffer[e.id.replace("agent-", "")];
        }),
      );
    });

    // Agent transcript streaming
    clientRef.current.on("response.audio_transcript.delta", (event: any) => {
      const responseId = event.response_id;
      const delta = event.delta;
      if (!delta || !responseId) return;

      const isNew = !agentTranscriptBuffer[responseId];

      if (isNew) {
        agentTranscriptBuffer[responseId] = "";
        pendingAgentResponsesRef.current.add(responseId);
      }

      agentTranscriptBuffer[responseId] += delta;

      setTranscript((prev) => {
        const existingIndex = prev.findIndex(
          (e) => e.id === `agent-${responseId}`,
        );

        if (existingIndex !== -1) {
          // Entry already in transcript — just update text
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            text: agentTranscriptBuffer[responseId],
          };
          return updated;
        }

        // Entry not yet in transcript
        // Check if there are pending user transcripts (Whisper still running)
        // We detect this by checking if any recent agent response is "in progress"
        // Store as pending so user transcript handler can flush it in correct order
        if (isNew) {
          pendingAgentEntries[responseId] = {
            id: `agent-${responseId}`,
            role: "agent",
            text: agentTranscriptBuffer[responseId],
            timestamp: new Date().toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: false,
            }),
          };
        } else {
          // Update the pending entry text too
          if (pendingAgentEntries[responseId]) {
            pendingAgentEntries[responseId] = {
              ...pendingAgentEntries[responseId],
              text: agentTranscriptBuffer[responseId],
            };
          }
        }

        return prev; // Don't add yet — wait for user transcript to flush
      });
    });

    // When agent response audio is done — if still pending, flush it now
    // (handles case where user didn't speak before Sarah, e.g. opening greeting)
    clientRef.current.on("response.audio_transcript.done", (event: any) => {
      const responseId = event.response_id;
      if (!responseId) return;

      pendingAgentResponsesRef.current.delete(responseId);

      // If still in pendingAgentEntries, it means no user transcript arrived
      // to flush it — add it directly now (e.g. Sarah's opening greeting)
      if (pendingAgentEntries[responseId]) {
        const entry = pendingAgentEntries[responseId];
        delete pendingAgentEntries[responseId];

        setTranscript((prev) => {
          const exists = prev.find((e) => e.id === entry.id);
          if (exists) return prev;
          return [
            ...prev,
            {
              ...entry,
              text: agentTranscriptBuffer[responseId] ?? entry.text,
              sequence: transcriptSequenceRef.current++,
            },
          ];
        });
      }

      delete agentTranscriptBuffer[responseId];
    });

    // Latency tracking — measure time-to-first-audio (perceived latency)
    clientRef.current.on("response.created", () => {
      requestTimestampRef.current = Date.now();
    });

    clientRef.current.on("response.audio_transcript.delta", () => {
      if (requestTimestampRef.current) {
        const sample = Date.now() - requestTimestampRef.current;
        requestTimestampRef.current = null; // only measure first delta
        latencySamplesRef.current.push(sample);
        const avg = Math.round(
          latencySamplesRef.current.reduce((a, b) => a + b, 0) /
            latencySamplesRef.current.length,
        );
        setLatency(avg);
      }
    });

    // Errors
    clientRef.current.on("error", (event: any) => {
      console.error("Realtime API error:", event);
      addToast({
        title: "Call Error",
        description:
          event?.error?.message ||
          event?.message ||
          "An error occurred during the call",
        color: "danger",
        timeout: 0,
      });
    });
  }, []);

  const startCall = useCallback(async () => {
    try {
      setIsConnecting(true);
      setTranscript([]);
      setLatency(0);
      setCallDuration("0:00");
      transcriptSequenceRef.current = 0;
      pendingAgentResponsesRef.current = new Set();
      latencySamplesRef.current = [];

      const tokenResponse = await fetch("/api/session");
      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        throw new Error(errorData.message || "Failed to get session token");
      }
      const { clientSecret } = await tokenResponse.json();
      const token = clientSecret.value;

      clientRef.current = new RealtimeWebRTCClient();
      setupEventHandlers();

      let greetingTriggered = false;
      clientRef.current.on("session.updated", () => {
        if (greetingTriggered) return;
        greetingTriggered = true;
        setTimeout(() => {
          clientRef.current?.triggerGreeting();
        }, 300);
      });

      clientRef.current.on("disconnect", () => {
        setIsConnected(false);
        setIsConnecting(false);
        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current);
          durationIntervalRef.current = null;
        }
        addToast({
          title: "Call Disconnected",
          description: "The call has ended.",
          color: "warning",
          timeout: 5000,
        });
      });

      await clientRef.current.connect(token);
      setIsConnected(true);
      setIsConnecting(false);

      let seconds = 0;
      durationIntervalRef.current = setInterval(() => {
        seconds++;
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        setCallDuration(`${minutes}:${secs.toString().padStart(2, "0")}`);
      }, 1000);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to start call";
      addToast({
        title: "Call Failed",
        description: errorMessage,
        color: "danger",
        timeout: 0,
      });
      setIsConnecting(false);
      setIsConnected(false);
      clientRef.current?.disconnect();
      clientRef.current = null;
    }
  }, [setupEventHandlers]);

  const endCall = useCallback(() => {
    clientRef.current?.disconnect();
    clientRef.current = null;

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    requestTimestampRef.current = null;
    setIsConnected(false);
    setIsMuted(false);
  }, []);

  const toggleMute = useCallback(() => {
    if (!clientRef.current) return;
    const track = clientRef.current.getMicTrack();
    if (track) {
      track.enabled = !track.enabled;
      setIsMuted(!track.enabled);
    }
  }, []);

  useEffect(() => {
    return () => {
      clientRef.current?.disconnect();
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, []);

  return {
    isConnecting,
    isConnected,
    transcript,
    latency,
    callDuration,
    startCall,
    endCall,
    toggleMute,
    isMuted,
  };
}
