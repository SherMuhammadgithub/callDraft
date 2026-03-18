// Main page — state machine that drives the call lifecycle UI.
// Each call status maps to a different full-screen view component.
"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { CallIdleView } from "@/components/CallIdleView";
import { CallConnectingView } from "@/components/CallConnectingView";
import { CallActiveView } from "@/components/CallActiveView";
import { CallEndedView } from "@/components/CallEndedView";
import { useCallSession } from "@/hooks/useCallSession";

// ─── Types ───────────────────────────────────────────────────────────────────
export type CallStatus = "idle" | "connecting" | "active" | "ended";

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function Home() {
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");

  // The callback fires when the call auto-disconnects (e.g. inactivity timeout)
  const callSession = useCallSession(() => setCallStatus("ended"));

  // Transition: idle → connecting → active
  const handleStartCall = async () => {
    setCallStatus("connecting");
    await callSession.startCall();
    setCallStatus("active");
  };

  // Transition: active → ended
  const handleEndCall = () => {
    callSession.endCall();
    setCallStatus("ended");
  };

  // Transition: ended → idle (reset for another call)
  const handleNewCall = () => {
    setCallStatus("idle");
  };

  // AnimatePresence mode="wait" ensures one view exits before the next enters
  return (
    <AnimatePresence mode="wait">
      {callStatus === "idle" && (
        <CallIdleView key="idle" onStartCall={handleStartCall} />
      )}

      {callStatus === "connecting" && (
        <CallConnectingView key="connecting" />
      )}

      {callStatus === "active" && (
        <CallActiveView
          key="active"
          transcript={callSession.transcript}
          isMuted={callSession.isMuted}
          callDuration={callSession.callDuration}
          latency={callSession.latency}
          voiceState={callSession.voiceState}
          latencyBreakdown={callSession.latencyBreakdown}
          onToggleMute={callSession.toggleMute}
          onEndCall={handleEndCall}
        />
      )}

      {callStatus === "ended" && (
        <CallEndedView
          key="ended"
          transcript={callSession.transcript}
          callDuration={callSession.callDuration}
          latency={callSession.latency}
          onNewCall={handleNewCall}
        />
      )}
    </AnimatePresence>
  );
}
