"use client";

import Image from "next/image";
import { Avatar } from "@heroui/react";

export type TranscriptEntry = {
  id: string;
  role: "user" | "agent";
  text: string;
  timestamp: string;
};

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
        <p className="text-sm leading-relaxed mt-0.5 text-fg">
          {entry.text}
        </p>
      </div>
    </div>
  );
}
