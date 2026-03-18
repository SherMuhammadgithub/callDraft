"use client";

import { Button, Tooltip } from "@heroui/react";

type CallControlsProps = {
  isMuted: boolean;
  isTranscriptOpen: boolean;
  isDebugOpen: boolean;
  onToggleMute: () => void;
  onToggleTranscript: () => void;
  onToggleDebug: () => void;
  onEndCall: () => void;
};

export function CallControls({
  isMuted,
  isTranscriptOpen,
  isDebugOpen,
  onToggleMute,
  onToggleTranscript,
  onToggleDebug,
  onEndCall,
}: CallControlsProps) {
  const controlBase =
    "w-12 h-12 rounded-full transition-all duration-200";
  const controlIdle =
    "bg-surface-overlay text-white hover:bg-surface-overlay/80";

  return (
    <div className="flex items-center gap-4">
      {/* Mic toggle */}
      <Tooltip content={isMuted ? "Unmute" : "Mute"} placement="top">
        <Button
          isIconOnly
          className={`${controlBase} ${
            isMuted ? "bg-destructive text-white" : controlIdle
          }`}
          onPress={onToggleMute}
        >
          {isMuted ? (
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M9 9v3a3 3 0 0 0 5.12 2.12" />
              <path d="M15 9.34V4a3 3 0 0 0-5.94-.6" />
              <path d="M17 16.95A7 7 0 0 1 5 12v-2" />
              <path d="M19 10v2a7 7 0 0 1-.11 1.23" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          ) : (
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="9" y="1" width="6" height="11" rx="3" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          )}
        </Button>
      </Tooltip>

      {/* End call — larger, red */}
      <Tooltip content="End call" placement="top">
        <Button
          isIconOnly
          className="w-14 h-14 rounded-full bg-destructive text-white hover:opacity-90 transition-all duration-200"
          onPress={onEndCall}
        >
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a.956.956 0 0 1-.29-.7c0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.1-.7-.28a11.27 11.27 0 0 0-2.67-1.85.996.996 0 0 1-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" />
          </svg>
        </Button>
      </Tooltip>

      {/* Transcript toggle */}
      <Tooltip
        content={isTranscriptOpen ? "Hide transcript" : "Show transcript"}
        placement="top"
      >
        <Button
          isIconOnly
          className={`${controlBase} ${
            isTranscriptOpen ? "bg-brand text-white" : controlIdle
          }`}
          onPress={onToggleTranscript}
        >
          <svg
            className="w-5 h-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </Button>
      </Tooltip>

      {/* Debug toggle */}
      <Tooltip
        content={isDebugOpen ? "Hide debug" : "Show debug"}
        placement="top"
      >
        <Button
          isIconOnly
          className={`${controlBase} ${
            isDebugOpen ? "bg-purple text-white" : controlIdle
          }`}
          onPress={onToggleDebug}
        >
          <svg
            className="w-5 h-5"
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
        </Button>
      </Tooltip>
    </div>
  );
}
