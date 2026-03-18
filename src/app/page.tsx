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
  const callSession = useCallSession();

  /**
   * Handle start call
   * Transition: idle → connecting → active
   */
  const handleStartCall = async () => {
    setCallStatus("connecting");
    await callSession.startCall();
    setCallStatus("active");
  };

  /**
   * Handle end call
   * Transition: active → ended
   */
  const handleEndCall = () => {
    callSession.endCall();
    setCallStatus("ended");
  };

  /**
   * Handle new call (from ended state)
   * Transition: ended → idle
   */
  const handleNewCall = () => {
    setCallStatus("idle");
  };

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
