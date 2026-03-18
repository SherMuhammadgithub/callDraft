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
  const entityList = Object.entries(entities).filter(
    ([, v]) => v !== null,
  ) as [string, string][];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="w-full max-w-sm border border-surface-overlay bg-surface-raised/95 backdrop-blur-sm rounded-md shadow-lg">
        <CardBody className="p-4 gap-3">
          {/* Header */}
          <div className="flex items-center gap-2">
            <svg
              className="w-3.5 h-3.5 text-muted-fg"
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
            <p className="text-[10px] font-semibold text-muted-fg uppercase tracking-wider">
              Debug Info
            </p>
          </div>

          <Divider className="bg-surface-overlay" />

          {/* Stage */}
          <div>
            <p className="text-[10px] text-muted-fg uppercase tracking-wide mb-1">
              Stage
            </p>
            <Chip
              size="sm"
              variant="flat"
              color="primary"
              classNames={{ content: "text-[10px] font-medium" }}
            >
              {STAGE_LABELS[stage]}
            </Chip>
          </div>

          {/* Intent */}
          <div>
            <p className="text-[10px] text-muted-fg uppercase tracking-wide mb-1">
              Detected Intent
            </p>
            <div className="flex items-center gap-2">
              <Chip
                size="sm"
                variant="flat"
                color="secondary"
                classNames={{
                  content: "text-[10px] font-medium capitalize",
                }}
              >
                {intent.intent}
              </Chip>
              <span className="text-[10px] text-muted-fg font-mono">
                {Math.round(intent.confidence * 100)}%
              </span>
            </div>
            <Progress
              size="sm"
              value={intent.confidence * 100}
              color={
                intent.confidence > 0.8
                  ? "success"
                  : intent.confidence > 0.5
                    ? "warning"
                    : "danger"
              }
              className="mt-1.5"
            />
          </div>

          {/* Extracted Entities */}
          {entityList.length > 0 && (
            <div>
              <p className="text-[10px] text-muted-fg uppercase tracking-wide mb-1">
                Extracted Entities
              </p>
              <div className="space-y-1">
                {entityList.map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-fg capitalize w-14 shrink-0">
                      {key}:
                    </span>
                    <span className="text-[10px] text-white font-medium truncate">
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
