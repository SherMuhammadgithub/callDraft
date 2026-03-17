/**
 * OpenAI Realtime API WebSocket Handler
 * Manages real-time voice communication with OpenAI's GPT-4 Realtime model
 */

export interface WebSocketEvent {
  type: string;
  [key: string]: any;
}

export interface RealtimeSessionConfig {
  model?: string;
  voice?: string;
  instructions?: string;
  modalities?: string[];
  input_audio_format?: string;
  output_audio_format?: string;
  input_audio_transcription?: {
    model: string;
  };
  turn_detection?: {
    type: string;
    threshold?: number;
    prefix_padding_ms?: number;
    silence_duration_ms?: number;
  };
}

export type WebSocketCallback = (event: WebSocketEvent) => void;

/**
 * Handler for OpenAI Realtime API WebSocket connection
 * Manages session lifecycle, audio streaming, and event handling
 */
export class RealtimeAPIClient {
  private ws: WebSocket | null = null;
  private sessionToken: string | null = null;
  private isConnected = false;
  private eventCallbacks: Map<string, WebSocketCallback[]> = new Map();

  /**
   * Initialize and connect to OpenAI Realtime API
   */
  async connect(sessionToken: string): Promise<void> {
    this.sessionToken = sessionToken;
    console.log("Connecting to OpenAI Realtime API with ephemeral session...");

    return new Promise((resolve, reject) => {
      try {
        // Per OpenAI docs, auth token is passed in the Sec-WebSocket-Protocol header
        // The WebSocket constructor's second argument is for subprotocols.
        this.ws = new WebSocket(
          `wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17`,
          [
            "realtime",
            `openai-insecure-api-key.${sessionToken}`, // ✅ Correct format
            "openai-beta.realtime-v1", // ✅ Required beta header
          ],
        );

        this.ws.binaryType = "arraybuffer";

        this.ws.onopen = () => {
          console.log("WebSocket connected to OpenAI Realtime API");
          this.isConnected = true;

          resolve();
        };

        this.ws.onmessage = (event: MessageEvent) => {
          try {
            const data = JSON.parse(
              event.data instanceof ArrayBuffer
                ? new TextDecoder().decode(event.data)
                : event.data,
            );

            this.handleWebSocketEvent(data);
          } catch (error) {
            console.error("Error parsing WebSocket message:", error);
          }
        };

        this.ws.onerror = (error: Event) => {
          console.error("WebSocket error:", error);
          this.isConnected = false;
          reject(new Error("WebSocket connection failed."));
        };

        this.ws.onclose = (event: CloseEvent) => {
          console.log(
            `WebSocket disconnected (code=${event.code}, reason=${event.reason || "none"})`,
          );
          this.isConnected = false;
          this.emit("disconnect", {
            type: "disconnect",
            code: event.code,
            reason: event.reason || "",
          });
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Send initial session configuration after event handlers are attached
   */
  startSession(): void {
    this.updateSession({
      modalities: ["text", "audio"],
      instructions: `You are Sarah, a virtual receptionist for Anderson Heating & Cooling, an HVAC company in Dallas, TX.

Your job is to:
- Greet callers warmly and professionally
- Ask what they need help with
- Collect their name, phone number, and address
- Listen to their HVAC issue description
- Offer to book an appointment (suggest the next available time)
- Confirm booking details and end with a friendly goodbye

Business Information:
- Business Hours: Mon-Fri 8AM-6PM, Emergency Service 24/7
- Services: AC repair, heating repair, installation, maintenance, duct cleaning
- Service Call Fee: $89
- Location: Dallas, TX

Important: Keep responses short and conversational (2-3 sentences max). This is a phone call, not an essay. Be friendly and empathetic.`,
      voice: "sage",
      input_audio_format: "pcm16",
      output_audio_format: "pcm16",
      input_audio_transcription: {
        model: "whisper-1",
      },
      turn_detection: {
        type: "server_vad",
        threshold: 0.5,
        prefix_padding_ms: 300,
        silence_duration_ms: 500,
      },
    });
  }

  /**
   * Send audio data to the WebSocket
   */
  sendAudio(audioData: Uint8Array): void {
    if (
      !this.ws ||
      !this.isConnected ||
      this.ws.readyState !== WebSocket.OPEN
    ) {
      console.warn("WebSocket not connected");
      return;
    }

    // Wrap audio in input_audio_buffer.append event
    const event = {
      type: "input_audio_buffer.append",
      audio: this.arrayBufferToBase64(audioData),
    };

    this.ws.send(JSON.stringify(event));
  }

  /**
   * Commit audio buffer (signal end of user input)
   */
  commitAudio(): void {
    if (
      !this.ws ||
      !this.isConnected ||
      this.ws.readyState !== WebSocket.OPEN
    ) {
      return;
    }
    // ✅ With server_vad, only commit — do NOT send response.create
    this.ws.send(JSON.stringify({ type: "input_audio_buffer.commit" }));
  }

  /**
   * Update session configuration
   */
  private updateSession(config: Partial<RealtimeSessionConfig>): void {
    if (!this.ws || !this.isConnected) {
      return;
    }

    const event = {
      type: "session.update",
      session: config,
    };

    this.ws.send(JSON.stringify(event));
  }

  /**
   * Handle incoming WebSocket events
   */
  // In realtimeClient.ts — add this inside handleWebSocketEvent
  private handleWebSocketEvent(event: WebSocketEvent): void {
    this.emit(event.type, event);

    // ✅ Auto-configure session only after server confirms it's ready
    if (event.type === "session.created") {
      this.sendSessionConfig();
    }

    if (
      event.type === "response.audio.delta" ||
      event.type === "response.audio_transcript.delta"
    ) {
      // skip logging
    } else if (event.type === "error") {
      console.error(`[WebSocket] Error:`, event.error);
    } else if (event.type === "response.audio.delta") {
      console.log(
        `[WebSocket] audio chunk received, length=${event.delta?.length}`,
      );
    } else {
      console.log(`[WebSocket] ${event.type}`);
    }
  }

  // rename startSession → sendSessionConfig, make private
  private sendSessionConfig(): void {
    this.updateSession({
      modalities: ["text", "audio"],
      instructions: `You are Sarah, a virtual receptionist for Anderson Heating & Cooling...`,
      voice: "sage",
      input_audio_format: "pcm16",
      output_audio_format: "pcm16",
      input_audio_transcription: { model: "whisper-1" },
      turn_detection: {
        type: "server_vad",
        threshold: 0.5,
        prefix_padding_ms: 300,
        silence_duration_ms: 500,
      },
    });
    // ✅ NO response.create here anymore
  }

  // New public method — call this AFTER recording starts
  triggerGreeting(): void {
    this.sendEvent({
      type: "response.create",
      response: {
        modalities: ["text", "audio"],
        instructions:
          "Greet the caller warmly and ask how you can help them today.",
      },
    });
  }

  // Keep sendEvent public for external use
  sendEvent(event: object): void {
    if (
      !this.ws ||
      !this.isConnected ||
      this.ws.readyState !== WebSocket.OPEN
    ) {
      console.warn("WebSocket not connected");
      return;
    }
    this.ws.send(JSON.stringify(event));
  }

  /**
   * Register event listener
   */
  on(eventType: string, callback: WebSocketCallback): () => void {
    if (!this.eventCallbacks.has(eventType)) {
      this.eventCallbacks.set(eventType, []);
    }

    this.eventCallbacks.get(eventType)!.push(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.eventCallbacks.get(eventType);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  /**
   * Emit event to all listeners
   */
  private emit(eventType: string, event: WebSocketEvent): void {
    const callbacks = this.eventCallbacks.get(eventType);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(event);
        } catch (error) {
          console.error(`Error in event callback for ${eventType}:`, error);
        }
      });
    }
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }

  /**
   * Check if connected
   */
  getIsConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Convert ArrayBuffer to Base64 for JSON transmission
   */
  private arrayBufferToBase64(buffer: Uint8Array): string {
    // ✅ Safe for large buffers — no stack overflow
    let binary = "";
    const chunkSize = 8192;
    for (let i = 0; i < buffer.length; i += chunkSize) {
      const chunk = buffer.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }
    return btoa(binary);
  }

  /**
   * Convert Base64 to ArrayBuffer
   */
  static base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}
