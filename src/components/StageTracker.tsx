// Horizontal progress indicator showing which stage of the call we're in.
// Stages progress left to right: greeting -> understanding -> info collection -> booking -> confirmation.
// Completed stages turn green, the current stage is highlighted in brand blue.
"use client";

import { Chip } from "@heroui/react";
import type { ConversationStage } from "@/lib/conversationAnalyzer";

const STAGES: { key: ConversationStage; label: string }[] = [
  { key: "greeting", label: "Greeting" },
  { key: "understanding", label: "Understanding" },
  { key: "info_collection", label: "Info Collection" },
  { key: "booking", label: "Booking" },
  { key: "confirmation", label: "Confirmation" },
];

export function StageTracker({
  currentStage,
}: {
  currentStage: ConversationStage;
}) {
  const currentIndex = STAGES.findIndex((s) => s.key === currentStage);

  return (
    <div className="flex items-center gap-1.5 flex-wrap justify-center">
      {STAGES.map((stage, i) => {
        const isActive = i === currentIndex;
        const isCompleted = i < currentIndex;

        return (
          <div key={stage.key} className="flex items-center gap-1.5">
            {i > 0 && (
              <div
                className={`h-px w-4 ${
                  isCompleted ? "bg-success" : "bg-border/20"
                } transition-colors duration-300`}
              />
            )}
            <Chip
              size="sm"
              variant="flat"
              classNames={{
                base: `${
                  isActive
                    ? "bg-brand text-white"
                    : isCompleted
                      ? "bg-success/15"
                      : "bg-surface-overlay/60"
                } transition-all duration-300`,
                content: `text-[10px] font-semibold tracking-wide ${
                  isActive
                    ? "text-white"
                    : isCompleted
                      ? "text-success"
                      : "text-muted-fg"
                }`,
              }}
            >
              {stage.label}
            </Chip>
          </div>
        );
      })}
    </div>
  );
}
