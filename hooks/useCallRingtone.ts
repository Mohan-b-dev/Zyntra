import { useEffect, useRef } from "react";

export const useCallRingtone = (isRinging: boolean) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Create audio element if it doesn't exist
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.loop = true;

      // Using a data URI for a simple ringtone beep
      // This creates a synthesized ringtone sound
      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Simple ringtone pattern
      audioRef.current.src = createRingtoneDataURI();
    }

    if (isRinging) {
      console.log("🔔 Starting ringtone");
      audioRef.current
        ?.play()
        .catch((err) => console.warn("⚠️ Ringtone play failed:", err));
    } else {
      console.log("🔕 Stopping ringtone");
      audioRef.current?.pause();
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
      }
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, [isRinging]);

  return null;
};

// Create a simple ringtone using Web Audio API
function createRingtoneDataURI(): string {
  // This is a placeholder - in production, you'd use an actual audio file
  // For now, we'll create a simple beep tone
  const sampleRate = 44100;
  const duration = 1;
  const frequency = 800;
  const samples = sampleRate * duration;

  const buffer = new ArrayBuffer(44 + samples * 2);
  const view = new DataView(buffer);

  // WAV header
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, samples * 2, true);

  // Generate sine wave
  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate;
    const value = Math.sin(2 * Math.PI * frequency * t) * 0.3 * 32767;
    view.setInt16(44 + i * 2, value, true);
  }

  const blob = new Blob([buffer], { type: "audio/wav" });
  return URL.createObjectURL(blob);
}
