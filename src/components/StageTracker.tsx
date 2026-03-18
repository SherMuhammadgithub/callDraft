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
                className={`h-px w-3 ${
                  isCompleted ? "bg-brand" : "bg-surface-overlay"
                } transition-colors duration-300`}
              />
            )}
            <Chip
              size="sm"
              variant={isActive ? "solid" : "flat"}
              color={
                isCompleted ? "success" : isActive ? "primary" : "default"
              }
              classNames={{
                base: `${
                  !isActive && !isCompleted ? "opacity-40" : ""
                } transition-all duration-300`,
                content: "text-[10px] font-semibold tracking-wide",
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
