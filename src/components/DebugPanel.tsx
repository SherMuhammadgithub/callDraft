// Debug overlay — shows conversation stage, detected intent, and extracted
// entities in real time. Toggled from the call controls during an active call.
// Useful for understanding what the conversation analyzer is picking up.
"use client";

import { Card, CardBody, Chip, Divider, Progress } from "@heroui/react";
import { motion } from "framer-motion";
import type {
  ConversationStage,
  ExtractedEntities,
  DetectedIntent,
} from "@/lib/conversationAnalyzer";

const STAGE_LABELS: Record<ConversationStage, string> = {
  greeting: "Greeting",
  understanding: "Understanding",
  info_collection: "Info Collection",
  booking: "Booking",
  confirmation: "Confirmation",
};

type DebugPanelProps = {
  stage: ConversationStage;
  intent: DetectedIntent;
  entities: ExtractedEntities;
};

export function DebugPanel({ stage, intent, entities }: DebugPanelProps) {
  // Only show entities that have actually been detected (non-null)
  const entityList = Object.entries(entities).filter(
    ([, v]) => v !== null,
  ) as [string, string][];

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="w-72 border border-border/20 bg-surface-raised backdrop-blur-sm rounded-md shadow-lg">
        <CardBody className="p-5 gap-4">
          {/* Header */}
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-purple"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
            <p className="text-xs font-semibold text-purple uppercase tracking-wider">
              Debug Info
            </p>
          </div>

          <Divider className="bg-border/20" />

          {/* Stage */}
          <div>
            <p className="text-xs text-white/60 uppercase tracking-wide mb-2">
              Stage
            </p>
            <Chip
              size="sm"
              variant="flat"
              classNames={{
                base: "bg-brand/20",
                content: "text-xs font-medium text-brand",
              }}
            >
              {STAGE_LABELS[stage]}
            </Chip>
          </div>

          {/* Intent */}
          <div>
            <p className="text-xs text-white/60 uppercase tracking-wide mb-2">
              Detected Intent
            </p>
            <div className="flex items-center gap-2">
              <Chip
                size="sm"
                variant="flat"
                classNames={{
                  base: "bg-purple/20",
                  content: "text-xs font-medium capitalize text-purple",
                }}
              >
                {intent.intent}
              </Chip>
              <span className="text-xs text-white/50 font-mono">
                {Math.round(intent.confidence * 100)}%
              </span>
            </div>
            <Progress
              size="sm"
              value={intent.confidence * 100}
              classNames={{
                track: "bg-surface-overlay",
                indicator:
                  intent.confidence > 0.8
                    ? "bg-success"
                    : intent.confidence > 0.5
                      ? "bg-warning"
                      : "bg-destructive",
              }}
              className="mt-2"
            />
          </div>

          {/* Extracted Entities */}
          {entityList.length > 0 && (
            <div>
              <p className="text-xs text-white/60 uppercase tracking-wide mb-2">
                Extracted Entities
              </p>
              <div className="space-y-2">
                {entityList.map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="text-xs text-white/40 capitalize w-14 shrink-0">
                      {key}:
                    </span>
                    <span className="text-xs text-white font-medium truncate">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </motion.div>
  );
}
