"use client";

import Image from "next/image";
import {
  Button,
  Card,
  CardBody,
  Chip,
  Divider,
  ScrollShadow,
} from "@heroui/react";
import { motion } from "framer-motion";
import { TranscriptBubble, type TranscriptEntry } from "./TranscriptBubble";

type CallEndedViewProps = {
  transcript: TranscriptEntry[];
  callDuration: string;
  latency: number;
  onNewCall: () => void;
};

function StatCard({
  value,
  label,
  icon,
}: {
  value: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 bg-panel rounded-md p-4 border border-border">
      <div className="w-9 h-9 rounded-md bg-brand-light flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-fg font-mono">{value}</p>
        <p className="text-[10px] text-muted-fg uppercase tracking-wide">
          {label}
        </p>
      </div>
    </div>
  );
}

export function CallEndedView({
  transcript,
  callDuration,
  latency,
  onNewCall,
}: CallEndedViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="flex h-screen overflow-hidden bg-panel"
    >
      {/* ═══ LEFT — Summary ═══ */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-md flex flex-col gap-6">
          {/* Header */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Image
                src="/sarah.png"
                alt="Sarah"
                width={80}
                height={80}
                className="rounded-full"
                priority
              />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-destructive/10 border-2 border-white flex items-center justify-center">
                <svg
                  className="w-3 h-3 text-destructive"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a.956.956 0 0 1-.29-.7c0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.1-.7-.28a11.27 11.27 0 0 0-2.67-1.85.996.996 0 0 1-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" />
                </svg>
              </div>
            </div>
            <div className="text-center">
              <h2 className="text-lg font-semibold text-fg">Call Ended</h2>
              <p className="text-xs text-muted-fg mt-1">
                with Sarah &middot; Anderson Heating & Cooling
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex flex-col gap-3">
            <StatCard
              value={callDuration}
              label="Duration"
              icon={
                <svg
                  className="w-4 h-4 text-brand"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              }
            />
            <StatCard
              value={`${transcript.length}`}
              label="Messages"
              icon={
                <svg
                  className="w-4 h-4 text-brand"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              }
            />
            <StatCard
              value={`${latency}ms`}
              label="Avg Latency"
              icon={
                <svg
                  className="w-4 h-4 text-brand"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              }
            />
          </div>

          {/* Quality indicator */}
          <div className="flex items-center justify-center">
            <Chip
              size="sm"
              color={latency < 800 ? "success" : latency < 1500 ? "warning" : "danger"}
              variant="flat"
            >
              {latency < 800
                ? "Excellent call quality"
                : latency < 1500
                  ? "Good call quality"
                  : "High latency detected"}
            </Chip>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 mt-2">
            <Button
              color="primary"
              className="w-full rounded-sm"
              size="lg"
              startContent={
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              }
              onPress={onNewCall}
            >
              Start New Call
            </Button>
          </div>
        </div>
      </div>

      {/* ═══ RIGHT — Transcript review ═══ */}
      {transcript.length > 0 && (
        <div className="hidden md:flex w-[400px] shrink-0 border-l border-border bg-white flex-col h-screen">
          {/* Header */}
          <div className="px-5 pt-5 pb-4 shrink-0">
            <h2 className="text-sm font-semibold text-fg">Call Transcript</h2>
            <p className="text-xs text-muted-fg mt-0.5">
              {transcript.length} messages &middot; {callDuration}
            </p>
          </div>
          <Divider className="bg-border" />
          {/* Messages */}
          <ScrollShadow className="flex-1 overflow-y-auto px-5 py-4">
            <div className="flex flex-col gap-5">
              {transcript.map((entry) => (
                <TranscriptBubble key={entry.id} entry={entry} />
              ))}
            </div>
          </ScrollShadow>
        </div>
      )}

      {/* Mobile: transcript below in a card */}
      {transcript.length > 0 && (
        <div className="md:hidden fixed inset-x-0 bottom-0 top-auto max-h-[40vh] bg-white border-t border-border">
          <div className="px-4 py-3 flex items-center justify-between border-b border-border">
            <p className="text-xs font-semibold text-fg">Transcript</p>
            <Chip size="sm" variant="flat" color="default">
              {transcript.length} messages
            </Chip>
          </div>
          <ScrollShadow className="overflow-y-auto px-4 py-3 max-h-[calc(40vh-48px)]">
            <div className="flex flex-col gap-4">
              {transcript.map((entry) => (
                <TranscriptBubble key={entry.id} entry={entry} />
              ))}
            </div>
          </ScrollShadow>
        </div>
      )}
    </motion.div>
  );
}
