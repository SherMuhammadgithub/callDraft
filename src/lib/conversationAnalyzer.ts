// Pure functions for conversation analysis — no dependencies, no side effects

import type { TranscriptEntry } from "@/components/TranscriptBubble";

export type ConversationStage =
  | "greeting"
  | "understanding"
  | "info_collection"
  | "booking"
  | "confirmation";

export type ExtractedEntities = {
  name: string | null;
  phone: string | null;
  address: string | null;
  time: string | null;
  issue: string | null;
};

export type DetectedIntent = {
  intent: string;
  confidence: number;
};

// ─── Stage Detection ────────────────────────────────────────────────────────
// Requires MULTIPLE keyword hits or user-role context to advance stages.
// This prevents Sarah's intro (which mentions "book an appointment") from
// immediately jumping to the booking stage.

const STAGE_RULES: {
  stage: ConversationStage;
  test: (transcript: TranscriptEntry[]) => boolean;
}[] = [
  {
    // Confirmation: agent explicitly confirms booking details AND user agrees
    stage: "confirmation",
    test: (t) => {
      const recent = t.slice(-4).map((e) => e.text).join(" ");
      const agentConfirmed =
        /\b(confirmed|booked|all set|scheduled for)\b/i.test(recent);
      const userAgreed = t
        .slice(-3)
        .some(
          (e) =>
            e.role === "user" &&
            /\b(yes|yeah|sounds good|perfect|great|thank)\b/i.test(e.text),
        );
      return agentConfirmed && userAgreed;
    },
  },
  {
    // Booking: USER explicitly requests or agrees to booking
    stage: "booking",
    test: (t) => {
      const userMsgs = t.filter((e) => e.role === "user");
      const userAskedBooking = userMsgs.some((e) =>
        /\b(book|schedule|appointment|tomorrow|come out|set up|yes.*appointment)\b/i.test(
          e.text,
        ),
      );
      // Also check if agent offered and user agreed
      const agentOffered = t.some(
        (e) =>
          e.role === "agent" &&
          /\b(book|schedule|appointment|available)\b/i.test(e.text),
      );
      const userAgreed = userMsgs.some((e) =>
        /\b(yes|yeah|sure|please|sounds good|that works)\b/i.test(e.text),
      );
      return userAskedBooking || (agentOffered && userAgreed);
    },
  },
  {
    // Info collection: user has provided at least one piece of personal info
    stage: "info_collection",
    test: (t) => {
      const userText = t
        .filter((e) => e.role === "user")
        .map((e) => e.text)
        .join(" ");
      const gaveName =
        /\b(my name is|i'm|this is|call me)\b/i.test(userText);
      const gavePhone = /\d{3}.*\d{3}.*\d{4}/.test(userText);
      const gaveAddress =
        /\b(address is|live at|located at|i'm at)\b/i.test(userText);
      const agentAsked = t.some(
        (e) =>
          e.role === "agent" &&
          /\b(name|phone|number|address|reach you|contact)\b/i.test(e.text),
      );
      return gaveName || gavePhone || gaveAddress || agentAsked;
    },
  },
  {
    // Understanding: user has described their issue
    stage: "understanding",
    test: (t) => {
      const userText = t
        .filter((e) => e.role === "user")
        .map((e) => e.text)
        .join(" ");
      return /\b(issue|problem|broken|not working|need|repair|help with|ac|heating|furnace|duct|leaking|noise)\b/i.test(
        userText,
      );
    },
  },
  {
    // Greeting: always matches as fallback (at least 1 message exists)
    stage: "greeting",
    test: (t) => t.length > 0,
  },
];

export function detectStage(transcript: TranscriptEntry[]): ConversationStage {
  if (transcript.length === 0) return "greeting";

  // Check from most advanced stage downward — first match wins
  for (const { stage, test } of STAGE_RULES) {
    if (test(transcript)) return stage;
  }

  return "greeting";
}

// ─── Entity Extraction ──────────────────────────────────────────────────────

const PHONE_RE = /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
const TIME_RE = /\b\d{1,2}(?::\d{2})?\s*(?:AM|PM|a\.m\.|p\.m\.)\b/i;
const NAME_RE =
  /(?:(?:my name is|i'm|i am|it's|this is|name's|call me|just)\s+)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i;
const ADDRESS_RE =
  /(?:(?:address is|live at|located at|i'm at)\s+)(.+?)(?:\.|,|$)/im;
const ISSUE_RE =
  /(?:(?:my|the|our)\s+)?(?:ac|air\s*condition(?:er|ing)?|heat(?:er|ing)?|furnace|duct|hvac|unit)\s+(?:is\s+)?(?:not\s+working|broken|leaking|making\s+noise|won't\s+(?:turn|start)|stopped)|(?:need|want)\s+(?:a\s+)?(?:repair|maintenance|installation|duct\s+cleaning|service)/i;

export function extractEntities(
  transcript: TranscriptEntry[],
): ExtractedEntities {
  const userText = transcript
    .filter((e) => e.role === "user")
    .map((e) => e.text)
    .join(" ");
  const allText = transcript.map((e) => e.text).join(" ");

  return {
    name: (userText.match(NAME_RE) || allText.match(NAME_RE))?.[1] || null,
    phone:
      (userText.match(PHONE_RE) || allText.match(PHONE_RE))?.[0] || null,
    address:
      (userText.match(ADDRESS_RE) || allText.match(ADDRESS_RE))?.[1]?.trim() ||
      null,
    time: allText.match(TIME_RE)?.[0] || null,
    issue:
      (userText.match(ISSUE_RE) || allText.match(ISSUE_RE))?.[0] || null,
  };
}

// ─── Intent Detection ───────────────────────────────────────────────────────

const INTENTS: { intent: string; pattern: RegExp; confidence: number }[] = [
  {
    intent: "emergency",
    pattern: /emergency|urgent|right now|immediately|flooding|gas leak/i,
    confidence: 0.95,
  },
  {
    intent: "booking",
    pattern: /book|schedule|appointment|available|tomorrow/i,
    confidence: 0.9,
  },
  {
    intent: "inquiry",
    pattern: /how much|cost|price|fee|charge/i,
    confidence: 0.85,
  },
  {
    intent: "complaint",
    pattern: /not working|broken|problem|issue|won't/i,
    confidence: 0.85,
  },
  {
    intent: "info_giving",
    pattern: /my name|my number|my address|i live|i'm at/i,
    confidence: 0.8,
  },
  {
    intent: "farewell",
    pattern: /bye|goodbye|thank|thanks|have a good/i,
    confidence: 0.8,
  },
  {
    intent: "cancellation",
    pattern: /never mind|cancel|forget it|changed my mind|don't bother/i,
    confidence: 0.85,
  },
  {
    intent: "greeting",
    pattern: /hello|hi|hey|good morning/i,
    confidence: 0.7,
  },
];

export function detectIntent(transcript: TranscriptEntry[]): DetectedIntent {
  if (transcript.length === 0) return { intent: "none", confidence: 0 };

  const recent = transcript.slice(-4).map((e) => e.text).join(" ");

  for (const { intent, pattern, confidence } of INTENTS) {
    if (pattern.test(recent)) return { intent, confidence };
  }

  return { intent: "general", confidence: 0.5 };
}
