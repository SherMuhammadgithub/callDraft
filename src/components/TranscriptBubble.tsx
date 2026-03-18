"use client";

import Image from "next/image";
import { Avatar } from "@heroui/react";

export type TranscriptEntry = {
  id: string;
  role: "user" | "agent";
  text: string;
  timestamp: string;
};

// ─── Entity Highlighting ────────────────────────────────────────────────────
// Uses lightweight <span> tags instead of Chip (which renders <div> and
// causes hydration errors inside <p>/<span> parents).

const PHONE_RE = /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
const TIME_RE = /\b\d{1,2}(?::\d{2})?\s*(?:AM|PM|a\.m\.|p\.m\.)\b/i;

function highlightEntities(text: string): React.ReactNode[] {
  const combined = new RegExp(
    `(${PHONE_RE.source}|${TIME_RE.source})`,
    "gi",
  );
  const parts = text.split(combined).filter(Boolean);

  if (parts.length === 1) return [text];

  return parts.map((part, i) => {
    if (/\d{3}.*\d{3}.*\d{4}/.test(part)) {
      return (
        <span
          key={i}
          className="inline-flex items-center px-1.5 py-0.5 rounded bg-purple/10 text-purple text-[11px] font-mono font-medium mx-0.5"
        >
          {part}
        </span>
      );
    }
    if (/\d{1,2}(?::\d{2})?\s*(?:AM|PM|a\.m\.|p\.m\.)/i.test(part)) {
      return (
        <span
          key={i}
          className="inline-flex items-center px-1.5 py-0.5 rounded bg-brand-light text-brand-dark text-[11px] font-mono font-medium mx-0.5"
        >
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

// ─── List + Text Formatting ─────────────────────────────────────────────────

function FormattedText({ text }: { text: string }) {
  // Placeholder while Whisper is processing
  if (text === "...") {
    return (
      <span className="text-sm text-muted-fg/60 italic select-none">
        Listening...
      </span>
    );
  }

  const lines = text.split("\n");
  const ulItems: string[] = [];
  const olItems: string[] = [];
  const plainLines: string[] = [];

  for (const line of lines) {
    const ulMatch = line.match(/^\s*[-•]\s+(.+)/);
    const olMatch = line.match(/^\s*\d+[.)]\s+(.+)/);
    if (ulMatch) {
      ulItems.push(ulMatch[1]);
    } else if (olMatch) {
      olItems.push(olMatch[1]);
    } else if (line.trim()) {
      plainLines.push(line.trim());
    }
  }

  return (
    <div className="space-y-1.5">
      {plainLines.length > 0 && (
        <span className="text-sm leading-relaxed text-fg block">
          {highlightEntities(plainLines.join(" "))}
        </span>
      )}
      {ulItems.length > 0 && (
        <ul className="list-disc list-inside space-y-0.5 text-sm text-fg ml-1">
          {ulItems.map((item, i) => (
            <li key={i} className="leading-relaxed">
              {highlightEntities(item)}
            </li>
          ))}
        </ul>
      )}
      {olItems.length > 0 && (
        <ol className="list-decimal list-inside space-y-0.5 text-sm text-fg ml-1">
          {olItems.map((item, i) => (
            <li key={i} className="leading-relaxed">
              {highlightEntities(item)}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

// ─── Transcript Bubble ──────────────────────────────────────────────────────

export function TranscriptBubble({ entry }: { entry: TranscriptEntry }) {
  const isAgent = entry.role === "agent";

  return (
    <div className="flex items-start gap-3">
      {isAgent ? (
        <Image
          src="/sarah.png"
          alt="Sarah"
          width={28}
          height={28}
          className="rounded-full shrink-0"
        />
      ) : (
        <Avatar
          name="Y"
          size="sm"
          classNames={{
            base: "w-7 h-7 shrink-0 text-[10px] bg-purple text-white",
          }}
        />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <p
            className={`text-xs font-semibold ${
              isAgent ? "text-brand" : "text-fg"
            }`}
          >
            {isAgent ? "Sarah" : "You"}
          </p>
          <p className="text-[10px] text-muted-fg">{entry.timestamp}</p>
        </div>
        <div className="mt-0.5">
          <FormattedText text={entry.text} />
        </div>
      </div>
    </div>
  );
}
