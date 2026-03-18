"use client";

import { useRef, useEffect } from "react";
import { Button, ScrollShadow, Divider } from "@heroui/react";
import { motion } from "framer-motion";
import { TranscriptBubble, type TranscriptEntry } from "./TranscriptBubble";

type TranscriptPanelProps = {
  transcript: TranscriptEntry[];
  onClose: () => void;
};

export function TranscriptPanel({ transcript, onClose }: TranscriptPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
    return () => clearTimeout(timer);
  }, [transcript]);

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-fg">Live test call</h2>
            <p className="text-xs text-muted-fg mt-0.5">
              Talk to your agent and see the transcript in real-time.
            </p>
          </div>
          <Button
            isIconOnly
            size="sm"
            variant="light"
            className="text-muted-fg hover:text-fg min-w-0 w-8 h-8"
            onPress={onClose}
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </Button>
        </div>
      </div>

      <Divider className="bg-border" />

      {/* Live Transcript label */}
      <div className="px-5 pt-4 pb-2 shrink-0 flex items-center gap-2">
        <motion.span
          className="w-2 h-2 rounded-full bg-destructive"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
        <p className="text-[10px] font-semibold text-muted-fg uppercase tracking-wider">
          Live Transcript
        </p>
      </div>

      {/* Transcript messages */}
      <ScrollShadow className="flex-1 overflow-y-auto px-5 pb-4">
        {transcript.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-12">
            <div className="w-12 h-12 rounded-lg bg-panel flex items-center justify-center border border-border">
              <svg
                className="w-6 h-6 text-muted-fg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p className="text-xs text-muted-fg text-center leading-relaxed">
              Transcript will appear here
              <br />
              as you speak with Sarah
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {transcript.map((entry) => (
              <TranscriptBubble key={entry.id} entry={entry} />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </ScrollShadow>
    </div>
  );
}
