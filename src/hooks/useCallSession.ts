"use client";

import { useRef, useCallback, useState, useEffect } from "react";
import { addToast } from "@heroui/react";
import { RealtimeWebRTCClient } from "@/lib/realtimeWebRTC";
import type { TranscriptEntry } from "@/components/TranscriptBubble";

// ─── Types ──────────────────────────────────────────────────────────────────

export type VoiceState = "listening" | "speaking" | "interrupted";

export type LatencyBreakdown = {
  stt: number;
  llm: number;
  total: number;
};

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
  voiceState: VoiceState;
  latencyBreakdown: LatencyBreakdown;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useCallSession(onAutoDisconnect?: () => void): UseCallSessionReturn {
  const clientRef = useRef<RealtimeWebRTCClient | null>(null);
  const requestTimestampRef = useRef<number | null>(null);
  const latencySamplesRef = useRef<number[]>([]);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Voice & latency refs
  const voiceStateRef = useRef<VoiceState>("listening");
  const sttStartRef = useRef<number | null>(null);
  const responseCreatedAtRef = useRef<number | null>(null);

  // Silence detection refs
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const nudgeCountRef = useRef(0);
  const userHasSpokenRef = useRef(false);
  const speechCooldownRef = useRef(false);
  const greetingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const endCallRef = useRef<() => void>(() => {});
  const onAutoDisconnectRef = useRef(onAutoDisconnect);

  // Existing state
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [latency, setLatency] = useState(0);
  const [callDuration, setCallDuration] = useState("0:00");

  // New state
  const [voiceState, setVoiceState] = useState<VoiceState>("listening");
  const [latencyBreakdown, setLatencyBreakdown] = useState<LatencyBreakdown>({
    stt: 0,
    llm: 0,
    total: 0,
  });

  // ─── Event Handlers ─────────────────────────────────────────────────────

  const setupEventHandlers = useCallback(() => {
    if (!clientRef.current) return;

    // Tracks in-progress agent response text by responseId
    let agentTranscriptBuffer: Record<string, string> = {};

    // ── User transcript (Whisper STT result) ────────────────────────────
    // Finds the placeholder inserted by speech_started and replaces its
    // text. Falls back to appending a new entry if no placeholder exists.

    clientRef.current.on(
      "conversation.item.input_audio_transcription.completed",
      (event: any) => {
        const userText = event.transcript;
        const itemId = event.item_id as string | undefined;

        // Empty transcription — remove placeholder if one exists
        if (!userText?.trim()) {
          if (itemId) {
            setTranscript((prev) => prev.filter((e) => e.id !== itemId));
          }
          return;
        }

        // Confirmed real user speech (transcription succeeded)
        userHasSpokenRef.current = true;
        if (greetingTimerRef.current) {
          clearTimeout(greetingTimerRef.current);
          greetingTimerRef.current = null;
        }

        // STT latency
        if (sttStartRef.current) {
          const sttLatency = Date.now() - sttStartRef.current;
          sttStartRef.current = null;
          setLatencyBreakdown((prev) => ({ ...prev, stt: sttLatency }));
        }

        setTranscript((prev) => {
          // Try to find and update the placeholder
          if (itemId) {
            const idx = prev.findIndex((e) => e.id === itemId);
            if (idx !== -1) {
              const updated = [...prev];
              updated[idx] = { ...updated[idx], text: userText };
              return updated;
            }
          }

          // Fallback — no placeholder found, append new entry
          return [
            ...prev,
            {
              id: itemId || `user-${Date.now()}`,
              role: "user" as const,
              text: userText,
              timestamp: new Date().toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false,
              }),
            },
          ];
        });
      },
    );

    // ── Interrupted response cleanup ────────────────────────────────────

    clientRef.current.on("response.cancelled", (event: any) => {
      const responseId = event.response_id;
      if (responseId) {
        setTranscript((prev) =>
          prev.filter((e) => e.id !== `agent-${responseId}`),
        );
        delete agentTranscriptBuffer[responseId];
      }
    });

    // ── Speech started (placeholder + interruption cleanup + voice state)

    clientRef.current.on("input_audio_buffer.speech_started", (event: any) => {
      const itemId = event.item_id as string | undefined;
      const agentWasSpeaking = voiceStateRef.current === "speaking";

      // Ignore echo: skip if agent was speaking or in post-speech cooldown
      if (agentWasSpeaking || speechCooldownRef.current) return;

      // Clear all timers — user is talking
      if (greetingTimerRef.current) {
        clearTimeout(greetingTimerRef.current);
        greetingTimerRef.current = null;
      }
      // Clear silence + inactivity timers — user is talking
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
      nudgeCountRef.current = 0;

      setTranscript((prev) => {
        // 1. Remove agent entries still being streamed (interruption)
        let updated = prev.filter((e) => {
          if (e.role !== "agent") return true;
          return !agentTranscriptBuffer[e.id.replace("agent-", "")];
        });

        // 2. Insert placeholder ONLY when agent was NOT speaking.
        //    During agent speech, speech_started is almost always echo/
        //    feedback — not real user input. If it IS a real interruption,
        //    transcription.completed fallback will still add the entry.
        if (itemId && !agentWasSpeaking && !updated.find((e) => e.id === itemId)) {
          updated = [
            ...updated,
            {
              id: itemId,
              role: "user" as const,
              text: "...",
              timestamp: new Date().toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false,
              }),
            },
          ];
        }

        return updated;
      });

      voiceStateRef.current = agentWasSpeaking ? "interrupted" : "listening";
      setVoiceState(voiceStateRef.current);
    });

    // ── Speech stopped ──────────────────────────────────────────────────

    clientRef.current.on("input_audio_buffer.speech_stopped", () => {
      sttStartRef.current = Date.now();
      voiceStateRef.current = "listening";
      setVoiceState("listening");
    });

    // ── Agent transcript streaming ──────────────────────────────────────
    // Add agent entry to transcript IMMEDIATELY on first delta.
    // No pending queue — entries appear as they stream in.

    clientRef.current.on("response.audio_transcript.delta", (event: any) => {
      const responseId = event.response_id;
      const delta = event.delta;
      if (!delta || !responseId) return;

      const isNew = !agentTranscriptBuffer[responseId];

      if (isNew) {
        agentTranscriptBuffer[responseId] = "";
        voiceStateRef.current = "speaking";
        setVoiceState("speaking");
      }

      agentTranscriptBuffer[responseId] += delta;

      setTranscript((prev) => {
        const existingIndex = prev.findIndex(
          (e) => e.id === `agent-${responseId}`,
        );

        if (existingIndex !== -1) {
          // Already in transcript — update text
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            text: agentTranscriptBuffer[responseId],
          };
          return updated;
        }

        // First delta — add directly to transcript
        return [
          ...prev,
          {
            id: `agent-${responseId}`,
            role: "agent" as const,
            text: agentTranscriptBuffer[responseId],
            timestamp: new Date().toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: false,
            }),
          },
        ];
      });
    });

    // ── Agent transcript done — just clean up buffer ────────────────────

    clientRef.current.on("response.audio_transcript.done", (event: any) => {
      const responseId = event.response_id;
      if (!responseId) return;
      delete agentTranscriptBuffer[responseId];
    });

    // ── Latency tracking ────────────────────────────────────────────────

    clientRef.current.on("response.created", () => {
      requestTimestampRef.current = Date.now();
      responseCreatedAtRef.current = Date.now();
    });

    clientRef.current.on("response.audio_transcript.delta", () => {
      if (requestTimestampRef.current) {
        const sample = Date.now() - requestTimestampRef.current;
        requestTimestampRef.current = null;
        latencySamplesRef.current.push(sample);
        const avg = Math.round(
          latencySamplesRef.current.reduce((a, b) => a + b, 0) /
            latencySamplesRef.current.length,
        );
        setLatency(avg);
        setLatencyBreakdown((prev) => ({ ...prev, llm: sample }));
      }
    });

    // ── Response done (total latency + voice state) ─────────────────────

    clientRef.current.on("response.done", () => {
      if (responseCreatedAtRef.current) {
        const total = Date.now() - responseCreatedAtRef.current;
        responseCreatedAtRef.current = null;
        setLatencyBreakdown((prev) => ({ ...prev, total }));
      }

      voiceStateRef.current = "listening";
      setVoiceState("listening");

      // Cooldown: ignore speech_started for 2s after agent finishes
      // (mic echo from agent audio can trigger false speech_started)
      speechCooldownRef.current = true;
      setTimeout(() => {
        speechCooldownRef.current = false;
      }, 2000);

      // Greeting timeout — if user has never spoken, nudge after 15s
      // then auto-disconnect 30s after that
      if (!userHasSpokenRef.current && !greetingTimerRef.current && nudgeCountRef.current < 1) {
        greetingTimerRef.current = setTimeout(() => {
          if (!userHasSpokenRef.current && clientRef.current && nudgeCountRef.current < 1) {
            nudgeCountRef.current++;
            clientRef.current.sendEvent({
              type: "response.create",
              response: {
                modalities: ["text", "audio"],
                instructions:
                  "The caller hasn't said anything yet. Gently say: 'Hello? Are you still there? Take your time — I'm here whenever you're ready.'",
              },
            });
          }
          greetingTimerRef.current = null;
        }, 15000);
      }

      // Start silence timer — nudge if user stays quiet for 12s
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (userHasSpokenRef.current && nudgeCountRef.current < 1) {
        silenceTimerRef.current = setTimeout(() => {
          if (
            voiceStateRef.current !== "speaking" &&
            clientRef.current &&
            nudgeCountRef.current < 1
          ) {
            nudgeCountRef.current++;
            clientRef.current.sendEvent({
              type: "response.create",
              response: {
                modalities: ["text", "audio"],
                instructions:
                  "The caller has been quiet for a while. Gently ask if they're still there or if they need more time to think.",
              },
            });
          }
          silenceTimerRef.current = null;
        }, 12000);
      }

      // Start inactivity auto-disconnect — 30s after nudge was already sent
      if (nudgeCountRef.current >= 1 && !inactivityTimerRef.current) {
        inactivityTimerRef.current = setTimeout(() => {
          if (clientRef.current) {
            // Tell Sarah to say goodbye before disconnecting
            clientRef.current.sendEvent({
              type: "response.create",
              response: {
                modalities: ["text", "audio"],
                instructions:
                  "The caller has not responded. Say a brief, polite goodbye like: 'It seems like you may have stepped away. I'll go ahead and end the call. Feel free to call back anytime. Goodbye!'",
              },
            });

            // Disconnect after giving Sarah time to say goodbye
            setTimeout(() => {
              endCallRef.current();
              addToast({
                title: "Call Disconnected",
                description:
                  "The call was ended due to 30 seconds of inactivity.",
                color: "warning",
                timeout: 8000,
              });
              onAutoDisconnectRef.current?.();
            }, 5000);
          }
          inactivityTimerRef.current = null;
        }, 30000);
      }
    });

    // ── Errors ──────────────────────────────────────────────────────────

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

  // ─── Start Call ─────────────────────────────────────────────────────────

  const startCall = useCallback(async () => {
    try {
      setIsConnecting(true);
      setTranscript([]);
      setLatency(0);
      setCallDuration("0:00");
      setVoiceState("listening");
      setLatencyBreakdown({ stt: 0, llm: 0, total: 0 });
      latencySamplesRef.current = [];
      sttStartRef.current = null;
      responseCreatedAtRef.current = null;
      nudgeCountRef.current = 0;
      userHasSpokenRef.current = false;
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
      if (greetingTimerRef.current) {
        clearTimeout(greetingTimerRef.current);
        greetingTimerRef.current = null;
      }

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

  // ─── End Call ───────────────────────────────────────────────────────────

  const endCall = useCallback(() => {
    clientRef.current?.disconnect();
    clientRef.current = null;

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    requestTimestampRef.current = null;
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    if (greetingTimerRef.current) {
      clearTimeout(greetingTimerRef.current);
      greetingTimerRef.current = null;
    }
    nudgeCountRef.current = 0;
    userHasSpokenRef.current = false;
    speechCooldownRef.current = false;
    setIsConnected(false);
    setIsMuted(false);
    setVoiceState("listening");
    // Remove unresolved "Listening..." placeholders
    setTranscript((prev) => prev.filter((e) => e.text !== "..."));
  }, []);

  // Keep refs in sync so timers can call without stale closure
  endCallRef.current = endCall;
  onAutoDisconnectRef.current = onAutoDisconnect;

  // ─── Toggle Mute ───────────────────────────────────────────────────────

  const toggleMute = useCallback(() => {
    if (!clientRef.current) return;
    const track = clientRef.current.getMicTrack();
    if (track) {
      track.enabled = !track.enabled;
      setIsMuted(!track.enabled);
    }
  }, []);

  // ─── Cleanup ──────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      clientRef.current?.disconnect();
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      if (greetingTimerRef.current) {
        clearTimeout(greetingTimerRef.current);
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
    voiceState,
    latencyBreakdown,
  };
}
