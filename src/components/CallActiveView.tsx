"use client";

import { useState } from "react";
import Image from "next/image";
import { Chip } from "@heroui/react";
import { motion, AnimatePresence } from "framer-motion";
import { CallControls } from "./CallControls";
import { TranscriptPanel } from "./TranscriptPanel";
import type { TranscriptEntry } from "./TranscriptBubble";

type CallActiveViewProps = {
  transcript: TranscriptEntry[];
  isMuted: boolean;
  callDuration: string;
  latency: number;
  onToggleMute: () => void;
  onEndCall: () => void;
};

// Waveform bar animation for speaking indicator
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

export function CallActiveView({
  transcript,
  isMuted,
  callDuration,
  latency,
  onToggleMute,
  onEndCall,
}: CallActiveViewProps) {
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(true);

  return (
    <motion.div
      initial={{ opacity: 0 }}    
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="flex min-h-screen"
    >
      {/* ═══ CENTER — Dark call area ═══ */}
      <div className="flex-1 flex flex-col bg-surface-dark">
        {/* Top bar — latency + live badge */}
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
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
              {latency}ms
            </Chip>
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

            {/* Speaking status */}
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand" />
              <p className="text-xs font-medium text-brand">
                Agent is speaking...
              </p>
            </div>

            {/* Waveform */}
            <WaveformBars />

            {/* Controls */}
            <div className="mt-4">
              <CallControls
                isMuted={isMuted}
                isTranscriptOpen={isTranscriptOpen}
                onToggleMute={onToggleMute}
                onToggleTranscript={() =>
                  setIsTranscriptOpen(!isTranscriptOpen)
                }
                onEndCall={onEndCall}
              />
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
            className="hidden md:block shrink-0 overflow-hidden border-l border-border bg-white"
          >
            <div className="w-[380px] h-full">
              <TranscriptPanel
                transcript={transcript}
                onClose={() => setIsTranscriptOpen(false)}
              />
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
            className="md:hidden fixed inset-x-0 bottom-0 h-[60vh ] z-50"
          >
            <TranscriptPanel
              transcript={transcript}
              onClose={() => setIsTranscriptOpen(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
