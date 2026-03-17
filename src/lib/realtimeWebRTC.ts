// lib/realtimeWebRTC.ts

export class RealtimeWebRTCClient {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private audioEl: HTMLAudioElement | null = null;
  private micStream: MediaStream | null = null;
  private eventCallbacks: Map<string, ((e: any) => void)[]> = new Map();

  async connect(ephemeralToken: string): Promise<void> {
    this.pc = new RTCPeerConnection();

    // Agent audio — browser handles playback automatically
    this.audioEl = document.createElement("audio");
    this.audioEl.autoplay = true;
    this.pc.ontrack = (e) => {
      this.audioEl!.srcObject = e.streams[0];
    };

    // Mic — browser handles capture automatically
    this.micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 24000,
      },
    });
    this.pc.addTrack(this.micStream.getTracks()[0]);

    // Data channel for sending/receiving events
    this.dc = this.pc.createDataChannel("oai-events");

    this.dc.onopen = () => {
      console.log("[WebRTC] Data channel open");
    };

    this.dc.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);

        // Auto-configure on session.created
        if (event.type === "session.created") {
          this.configureSession();
        }

        this.emit(event.type, event);

        if (
          event.type !== "response.audio.delta" &&
          event.type !== "response.audio_transcript.delta"
        ) {
          console.log("[WebRTC]", event.type);
        }
      } catch (err) {
        console.error("[WebRTC] Failed to parse event:", err);
      }
    };

    this.dc.onerror = (e) => {
      console.error("[WebRTC] Data channel error:", e);
      this.emit("error", { type: "error", message: "Data channel error" });
    };

    this.pc.onconnectionstatechange = () => {
      console.log("[WebRTC] Connection state:", this.pc?.connectionState);
      if (
        this.pc?.connectionState === "disconnected" ||
        this.pc?.connectionState === "failed" ||
        this.pc?.connectionState === "closed"
      ) {
        this.emit("disconnect", { type: "disconnect" });
      }
    };

    // SDP handshake with OpenAI
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);

    const res = await fetch(
      "https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ephemeralToken}`,
          "Content-Type": "application/sdp",
        },
        body: offer.sdp,
      },
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI WebRTC handshake failed: ${err}`);
    }

    const answerSdp = await res.text();
    await this.pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
  }

  private configureSession(): void {
    this.sendEvent({
      type: "session.update",
      session: {
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
        input_audio_transcription: { model: "whisper-1" },
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500,
        },
      },
    });
  }

  triggerGreeting(): void {
    this.sendEvent({
      type: "response.create",
      response: {
        modalities: ["text", "audio"],
        instructions:
          "Greet the caller warmly. Introduce yourself as Sarah from Anderson Heating & Cooling and ask how you can help them today.",
      },
    });
  }

  sendEvent(event: object): void {
    if (this.dc?.readyState === "open") {
      this.dc.send(JSON.stringify(event));
    } else {
      console.warn("[WebRTC] Data channel not open, cannot send event");
    }
  }

  getMicTrack(): MediaStreamTrack | null {
    return this.micStream?.getTracks()[0] ?? null;
  }

  on(type: string, cb: (e: any) => void): void {
    if (!this.eventCallbacks.has(type)) {
      this.eventCallbacks.set(type, []);
    }
    this.eventCallbacks.get(type)!.push(cb);
  }

  private emit(type: string, event: any): void {
    this.eventCallbacks.get(type)?.forEach((cb) => {
      try {
        cb(event);
      } catch (err) {
        console.error(`[WebRTC] Error in handler for ${type}:`, err);
      }
    });
  }

  disconnect(): void {
    this.micStream?.getTracks().forEach((t) => t.stop());
    this.dc?.close();
    this.pc?.close();
    this.pc = null;
    this.dc = null;
    this.micStream = null;
    if (this.audioEl) {
      this.audioEl.srcObject = null;
      this.audioEl = null;
    }
  }
}
