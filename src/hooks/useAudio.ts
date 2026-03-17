"use client";

// This file is deprecated — audio is now handled natively by WebRTC.
// Safe stub to prevent import errors during migration.

export interface UseAudioReturn {
  isReady: boolean;
  isMuted: boolean;
  error: string | null;
  initAudio: () => Promise<void>;
  startRecording: (onAudioData: (data: Uint8Array) => void) => void;
  stopRecording: () => void;
  toggleMute: () => void;
  playAudio: (audioBuffer: ArrayBuffer) => Promise<void>;
  cleanup: () => void;
}

export function useAudio(): UseAudioReturn {
  return {
    isReady: true,
    isMuted: false,
    error: null,
    initAudio: async () => {},
    startRecording: () => {},
    stopRecording: () => {},
    toggleMute: () => {},
    playAudio: async () => {},
    cleanup: () => {},
  };
}
