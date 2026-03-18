// API route that mints short-lived OpenAI Realtime tokens for the browser.
// The browser never sees our real API key — it only gets an ephemeral secret
// that expires in ~60s, just long enough to open a WebRTC connection.
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    // Catch missing or placeholder keys early so we get a clear error
    if (!apiKey || apiKey === "sk-placeholder") {
      return NextResponse.json(
        {
          error: "OPENAI_API_KEY not configured",
          message:
            "Please set OPENAI_API_KEY in .env.local to enable voice features",
        },
        { status: 401 }
      );
    }

    // Request a short-lived session token from OpenAI's Realtime API
    const response = await fetch(
      "https://api.openai.com/v1/realtime/sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-realtime-mini",
          voice: "sage", // "sage" is the voice we picked for Sarah
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("OpenAI API Error:", errorData);

      return NextResponse.json(
        {
          error: "Failed to create session",
          message: errorData.error?.message || "Unknown error from OpenAI API",
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json(
      {
        clientSecret: {
          value: data.client_secret.value,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Session creation error:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
