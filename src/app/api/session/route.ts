import { NextRequest, NextResponse } from "next/server";

/**
 * API Route: GET /api/session
 * Returns an ephemeral token for OpenAI Realtime API WebSocket connection
 * 
 * The token is valid for 60 seconds and expires automatically
 * Environment: OPENAI_API_KEY must be set in .env.local
 */
export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    // Validate API key
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

    /**
     * Call OpenAI API to create ephemeral token
     * Tokens are valid for 60 seconds and tied to this server/client only
     */
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
          voice: "sage", // Sarah's voice for the agent
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
