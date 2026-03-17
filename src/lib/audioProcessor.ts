/**
 * Audio Processing Utilities
 * Handles microphone input and speaker output for real-time voice communication
 */

export class AudioProcessor {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private monitorGainNode: GainNode | null = null;
  private nextPlaybackTime = 0;

  /**
   * Initialize audio context and get microphone access
   */
  async initMicrophone(): Promise<MediaStream> {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Initialize AudioContext if not already done
      if (!this.audioContext) {
        this.audioContext = new (
          window.AudioContext || (window as any).webkitAudioContext
        )();
      }

      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume();
      }

      // Create source from microphone stream
      if (!this.sourceNode && this.audioContext) {
        this.sourceNode = this.audioContext.createMediaStreamSource(
          this.mediaStream,
        );
      }

      return this.mediaStream;
    } catch (error) {
      console.error("Microphone access denied:", error);
      throw new Error(
        "Microphone access denied. Please check your browser permissions.",
      );
    }
  }

  /**
   * Start recording audio from microphone
   * Captures microphone audio and streams PCM16 chunks for Realtime API
   */
  startRecording(onAudioData: (data: Uint8Array) => void): void {
    if (!this.mediaStream || !this.audioContext || !this.sourceNode) {
      throw new Error("Microphone not initialized. Call initMicrophone first.");
    }

    // Avoid duplicate processor attachment across repeated starts.
    if (this.processorNode) {
      this.stopRecording();
    }

    const inputSampleRate = this.audioContext.sampleRate;
    const targetSampleRate = 24000;

    if (this.audioContext.state === "suspended") {
      this.audioContext.resume().catch(() => undefined);
    }

    this.processorNode = this.audioContext.createScriptProcessor(4096, 1, 1);
    this.monitorGainNode = this.audioContext.createGain();
    this.monitorGainNode.gain.value = 0;

    this.processorNode.onaudioprocess = (event: AudioProcessingEvent) => {
      const input = event.inputBuffer.getChannelData(0);
      const mono = new Float32Array(input);
      const downsampled =
        inputSampleRate === targetSampleRate
          ? mono
          : this.downsample(mono, inputSampleRate, targetSampleRate);

      const pcm = new Int16Array(downsampled.length);
      for (let i = 0; i < downsampled.length; i++) {
        const s = Math.max(-1, Math.min(1, downsampled[i]));
        pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }

      onAudioData(new Uint8Array(pcm.buffer));
    };

    this.sourceNode.connect(this.processorNode);
    this.processorNode.connect(this.monitorGainNode);
    this.monitorGainNode.connect(this.audioContext.destination);
  }

  /**
   * Stop recording audio
   */
  stopRecording(): void {
    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode.onaudioprocess = null;
      this.processorNode = null;
    }

    if (this.monitorGainNode) {
      this.monitorGainNode.disconnect();
      this.monitorGainNode = null;
    }
  }

  /**
   * Play PCM16 mono audio returned by Realtime API
   */
  async playAudio(audioBuffer: ArrayBuffer): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
    }

    try {
      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume();
      }

      // Ensure 16-bit alignment.
      const byteLength = audioBuffer.byteLength - (audioBuffer.byteLength % 2);
      const aligned =
        byteLength === audioBuffer.byteLength
          ? audioBuffer
          : audioBuffer.slice(0, byteLength);

      const pcm16 = new Int16Array(aligned);
      const float32 = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / 0x8000;
      }

      const sampleRate = 24000;
      const buffer = this.audioContext.createBuffer(1, float32.length, sampleRate);
      buffer.copyToChannel(float32, 0);

      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.audioContext.destination);

      const startAt = Math.max(this.audioContext.currentTime, this.nextPlaybackTime);
      source.start(startAt);
      this.nextPlaybackTime = startAt + buffer.duration;
    } catch (error) {
      console.error("Error playing audio:", error);
    }
  }

  /**
   * Convert PCM audio data to blob for transmission
   */
  pcmToBlob(pcmData: Float32Array, sampleRate: number = 24000): Blob {
    const PCM_SAMPLE_RATE = 16000; // Convert to 16kHz if needed
    const downsampled =
      sampleRate !== PCM_SAMPLE_RATE
        ? this.downsample(pcmData, sampleRate, PCM_SAMPLE_RATE)
        : pcmData;

    const int16Data = new Int16Array(downsampled.length);
    for (let i = 0; i < downsampled.length; i++) {
      int16Data[i] =
        Math.max(-1, Math.min(1, downsampled[i])) < 0
          ? downsampled[i] * 0x8000
          : downsampled[i] * 0x7fff;
    }

    return new Blob([int16Data.buffer], { type: "audio/pcm" });
  }

  /**
   * Downsample audio for transmission
   */
  private downsample(
    data: Float32Array,
    fromSampleRate: number,
    toSampleRate: number,
  ): Float32Array {
    if (fromSampleRate === toSampleRate) {
      return data;
    }

    const sampleRateRatio = fromSampleRate / toSampleRate;
    const newLength = Math.round(data.length / sampleRateRatio);
    const result = new Float32Array(newLength);

    let offsetResult = 0;
    let offsetData = 0;
    while (offsetResult < result.length) {
      const nextOffsetData = Math.round((offsetResult + 1) * sampleRateRatio);
      let accum = 0;
      let count = 0;
      for (let i = offsetData; i < nextOffsetData && i < data.length; i++) {
        accum += data[i];
        count++;
      }
      result[offsetResult] = accum / count;
      offsetResult++;
      offsetData = nextOffsetData;
    }

    return result;
  }

  /**
   * Mute microphone (pause recording)
   */
  mute(): void {
    if (this.mediaStream) {
      this.mediaStream.getAudioTracks().forEach((track) => {
        track.enabled = false;
      });
    }
  }

  /**
   * Unmute microphone (resume recording)
   */
  unmute(): void {
    if (this.mediaStream) {
      this.mediaStream.getAudioTracks().forEach((track) => {
        track.enabled = true;
      });
    }
  }

  /**
   * Clean up audio resources
   */
  cleanup(): void {
    this.stopRecording();

    if (this.mediaStream) {
      this.mediaStream.getAudioTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.nextPlaybackTime = 0;
    this.sourceNode = null;
  }
}
