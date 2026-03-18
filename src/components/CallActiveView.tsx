"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { Chip } from "@heroui/react";
import { motion, AnimatePresence } from "framer-motion";
import { CallControls } from "./CallControls";
import { TranscriptPanel } from "./TranscriptPanel";
import { StageTracker } from "./StageTracker";
import { ToolCallCard } from "./ToolCallCard";
import { DebugPanel } from "./DebugPanel";
import type { TranscriptEntry } from "./TranscriptBubble";
import type { VoiceState, LatencyBreakdown } from "@/hooks/useCallSession";
import {
  detectStage,
  extractEntities,
  detectIntent,
} from "@/lib/conversationAnalyzer";

type CallActiveViewProps = {
  transcript: TranscriptEntry[];
  isMuted: boolean;
  callDuration: string;
  latency: number;
  voiceState: VoiceState;
  latencyBreakdown: LatencyBreakdown;
  onToggleMute: () => void;
  onEndCall: () => void;
};

// ─── Waveform Animation ─────────────────────────────────────────────────────

function WaveformBars() {
  const bars = [3, 5, 7, 4, 8, 6, 3, 5, 7, 4, 8, 6, 3, 5, 7];
  return (
    <div className="flex items-center justify-center gap-[3px] h-10">
      {bars.map((height, i) => (
        <motion.span
          key={i}
          className="w-[3px] rounded-full bg-brand"
          animate={{
            height: [`${height * 3}px`, `${height * 6}px`, `${height * 3}px`],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.05,
          }}
        />
      ))}
    </div>
  );
}

// ─── Listening Indicator ────────────────────────────────────────────────────

function ListeningIndicator() {
  return (
    <div className="flex items-center justify-center h-10">
      <motion.div
        className="w-8 h-8 rounded-full border-2 border-success/30 flex items-center justify-center"
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <svg
          className="w-4 h-4 text-success"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="9" y="1" width="6" height="11" rx="3" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        </svg>
      </motion.div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function CallActiveView({
  transcript,
  isMuted,
  callDuration,
  latency,
  voiceState,
  latencyBreakdown,
  onToggleMute,
  onEndCall,
}: CallActiveViewProps) {
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(true);
  const [isDebugOpen, setIsDebugOpen] = useState(false);

  // Conversation analysis (recomputed when transcript changes)
  const stage = useMemo(() => detectStage(transcript), [transcript]);
  const entities = useMemo(() => extractEntities(transcript), [transcript]);
  const intent = useMemo(() => detectIntent(transcript), [transcript]);

  // ToolCallCard is intentionally NOT auto-shown based on keyword detection.
  // It should only appear when real function-calling events arrive from
  // the Realtime API (future enhancement). Kept here for reference.
  const showToolCall = false;

  // Voice state display config
  const voiceConfig = {
    listening: { color: "bg-success", textColor: "text-success", label: "Listening..." },
    speaking: { color: "bg-brand", textColor: "text-brand", label: "Agent is speaking..." },
    interrupted: { color: "bg-warning", textColor: "text-warning", label: "Interrupted" },
  }[voiceState];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="flex h-screen overflow-hidden"
    >
      {/* ═══ CENTER — Dark call area ═══ */}
      <div className="flex-1 flex flex-col bg-surface-dark">
        {/* Top bar — latency + live badge */}
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Chip
              size="sm"
              variant="flat"
              color={
                latency < 800
                  ? "success"
                  : latency < 1500
                    ? "warning"
                    : "danger"
              }
              classNames={{ content: "font-mono text-xs" }}
            >
              {latency}ms avg
            </Chip>
            {latencyBreakdown.stt > 0 && (
              <span className="text-[10px] font-mono text-muted-fg">
                STT {latencyBreakdown.stt}ms
              </span>
            )}
            {latencyBreakdown.llm > 0 && (
              <span className="text-[10px] font-mono text-muted-fg">
                LLM {latencyBreakdown.llm}ms
              </span>
            )}
            {latencyBreakdown.total > 0 && (
              <span className="text-[10px] font-mono text-muted-fg">
                Total {latencyBreakdown.total}ms
              </span>
            )}
          </div>
          <Chip
            size="sm"
            variant="flat"
            color="danger"
            startContent={
              <motion.span
                className="w-1.5 h-1.5 rounded-full bg-destructive"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            }
            classNames={{
              content: "text-[10px] font-semibold uppercase tracking-wider",
            }}
          >
            Live
          </Chip>
        </div>

        {/* Stage tracker */}
        <div className="px-6 pb-3">
          <StageTracker currentStage={stage} />
        </div>

        {/* Center content */}
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-6">
            {/* Avatar with shimmer + ring */}
            <div className="relative avatar-shimmer rounded-full">
              <Image
                src="/sarah.png"
                alt="Sarah"
                width={112}
                height={112}
                className="rounded-full md:w-[112px] md:h-[112px]"
                priority
              />
              {/* Animated ring */}
              <motion.span
                className="absolute inset-[-8px] rounded-full border-2 border-brand"
                animate={{
                  scale: [1, 1.08, 1],
                  opacity: [0.5, 0.2, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            </div>

            {/* Name + subtitle */}
            <div className="text-center">
              <h2 className="text-xl font-semibold text-white">Sarah</h2>
              <p className="text-xs text-muted-fg mt-1">
                AI Agent &middot; Anderson Heating & Cooling
              </p>
            </div>

            {/* Large timer */}
            <p className="text-4xl md:text-5xl font-light text-white font-mono tracking-wider">
              {callDuration}
            </p>

            {/* Dynamic voice state indicator */}
            <div className="flex items-center gap-2">
              <motion.span
                className={`w-2 h-2 rounded-full ${voiceConfig.color}`}
                animate={
                  voiceState === "listening"
                    ? { scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }
                    : {}
                }
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <p className={`text-xs font-medium ${voiceConfig.textColor}`}>
                {voiceConfig.label}
              </p>
            </div>

            {/* Waveform / Listening indicator */}
            {voiceState === "speaking" ? (
              <WaveformBars />
            ) : voiceState === "listening" ? (
              <ListeningIndicator />
            ) : null}

            {/* Controls + Debug panel */}
            <div className="mt-4 relative">
              <CallControls
                isMuted={isMuted}
                isTranscriptOpen={isTranscriptOpen}
                isDebugOpen={isDebugOpen}
                onToggleMute={onToggleMute}
                onToggleTranscript={() =>
                  setIsTranscriptOpen(!isTranscriptOpen)
                }
                onToggleDebug={() => setIsDebugOpen(!isDebugOpen)}
                onEndCall={onEndCall}
              />

              {/* Debug panel — anchored to the right of controls */}
              <AnimatePresence>
                {isDebugOpen && (
                  <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 z-10">
                    <DebugPanel
                      stage={stage}
                      intent={intent}
                      entities={entities}
                    />
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ RIGHT SIDE — Static transcript panel (desktop) ═══ */}
      <AnimatePresence>
        {isTranscriptOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 380, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="hidden md:flex shrink-0 overflow-hidden border-l border-border bg-white flex-col h-screen"
          >
            <div className="w-[380px] h-full flex flex-col">
              <div className="flex-1 min-h-0">
                <TranscriptPanel
                  transcript={transcript}
                  onClose={() => setIsTranscriptOpen(false)}
                />
              </div>

              {/* Tool call card — appears at bottom of transcript */}
              <AnimatePresence>
                {showToolCall && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="shrink-0 border-t border-border overflow-hidden"
                  >
                    <div className="p-4">
                      <ToolCallCard entities={entities} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Mobile transcript (bottom sheet) ═══ */}
      <AnimatePresence>
        {isTranscriptOpen && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="md:hidden fixed inset-x-0 bottom-0 h-[60vh] z-50 flex flex-col"
          >
            <TranscriptPanel
              transcript={transcript}
              onClose={() => setIsTranscriptOpen(false)}
            />

            {/* Tool call card — mobile */}
            <AnimatePresence>
              {showToolCall && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="shrink-0 border-t border-border bg-white overflow-hidden"
                >
                  <div className="p-3">
                    <ToolCallCard entities={entities} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
