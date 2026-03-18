// Core hook for managing a voice call session with OpenAI's Realtime API.
// Handles: connection lifecycle, transcript assembly, latency measurement,
// mute toggle, silence/inactivity detection, and auto-disconnect.
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
  const requestTimestampRef = useRef<number | null>(null); // when we last sent a request (for latency calc)
  const latencySamplesRef = useRef<number[]>([]); // rolling set of latency samples for averaging
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Voice & latency timing refs
  const voiceStateRef = useRef<VoiceState>("listening");
  const sttStartRef = useRef<number | null>(null); // marks when speech stopped, to measure STT latency
  const responseCreatedAtRef = useRef<number | null>(null); // marks response.created for total latency

  // Silence/inactivity detection — nudges the user if they go quiet,
  // then auto-disconnects if they still don't respond
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const nudgeCountRef = useRef(0); // how many "are you there?" nudges we've sent
  const userHasSpokenRef = useRef(false); // has the user said anything at all?
  const speechCooldownRef = useRef(false); // ignore speech_started briefly after agent stops (echo suppression)
  const greetingTimerRef = useRef<NodeJS.Timeout | null>(null); // fires if user never speaks after greeting
  const endCallRef = useRef<() => void>(() => {}); // stable ref so timers can call endCall without stale closure
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

  // Wire up all the Realtime API event handlers. Called once per startCall().
  const setupEventHandlers = useCallback(() => {
    if (!clientRef.current) return;

    // Accumulates streaming agent text keyed by responseId so we can
    // update the transcript entry in-place as deltas arrive
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
    // This fires when the VAD detects the user starting to talk. We insert
    // a "..." placeholder in the transcript that gets replaced once Whisper
    // finishes transcription.

    clientRef.current.on("input_audio_buffer.speech_started", (event: any) => {
      const itemId = event.item_id as string | undefined;
      const agentWasSpeaking = voiceStateRef.current === "speaking";

      // Ignore echo: the agent's own audio can trigger the VAD, so skip
      // if Sarah was speaking or we're in the post-speech cooldown window
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

    // ── Speech stopped — start the STT latency clock

    clientRef.current.on("input_audio_buffer.speech_stopped", () => {
      sttStartRef.current = Date.now(); // measure how long Whisper takes
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
    // We measure two things: time-to-first-token (LLM latency) and total
    // response duration. Both start from response.created.

    clientRef.current.on("response.created", () => {
      requestTimestampRef.current = Date.now();
      responseCreatedAtRef.current = Date.now();
    });

    // Only the FIRST delta per response counts as time-to-first-token
    clientRef.current.on("response.audio_transcript.delta", () => {
      if (requestTimestampRef.current) {
        const sample = Date.now() - requestTimestampRef.current;
        requestTimestampRef.current = null; // null it so subsequent deltas are ignored
        latencySamplesRef.current.push(sample);
        // Running average across all responses in this call
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

      // 2s cooldown after agent finishes speaking — prevents the agent's
      // own audio (played through speakers) from triggering a false
      // speech_started event via the microphone
      speechCooldownRef.current = true;
      setTimeout(() => {
        speechCooldownRef.current = false;
      }, 2000);

      // Greeting timeout — if the user hasn't said anything after Sarah's
      // greeting, gently prompt them after 15s. If still silent, we'll
      // auto-disconnect 30s later (handled by the inactivity timer below).
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

      // Mid-conversation silence timer — if the user was talking earlier
      // but has gone quiet for 12s, ask if they're still there
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

      // Final inactivity auto-disconnect — 30s after a nudge was already
      // sent and the user still hasn't responded. Sarah says goodbye, then
      // we hang up after 5s to let the audio finish playing.
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

  // Starts a new call: resets all state, fetches ephemeral token, opens WebRTC
  const startCall = useCallback(async () => {
    try {
      // Reset everything from any previous call
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

      // Step 1: get an ephemeral token from our API route
      const tokenResponse = await fetch("/api/session");
      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        throw new Error(errorData.message || "Failed to get session token");
      }
      const { clientSecret } = await tokenResponse.json();
      const token = clientSecret.value;

      // Step 2: create the WebRTC client and wire up event handlers
      clientRef.current = new RealtimeWebRTCClient();
      setupEventHandlers();

      // Once the session config is accepted, trigger Sarah's greeting.
      // Small delay lets the audio pipeline stabilize before she speaks.
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

      // Step 3: open the WebRTC connection (SDP handshake + mic access)
      await clientRef.current.connect(token);
      setIsConnected(true);
      setIsConnecting(false);

      // Start a simple wall-clock timer for call duration display
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

  // Sync refs on every render so timer callbacks always have the latest values
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
