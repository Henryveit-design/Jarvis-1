import { useCallback, useEffect, useRef } from "react";

function pickGermanVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const exact = voices.find((voice) => voice.lang.toLowerCase() === "de-de");
  if (exact) return exact;
  const german = voices.find((voice) => voice.lang.toLowerCase().startsWith("de"));
  return german ?? null;
}

export interface UseSpeechSynthesis {
  isSupported: boolean;
  speak: (text: string, onEnd?: () => void) => void;
  cancel: () => void;
}

export function useSpeechSynthesis(): UseSpeechSynthesis {
  const isSupported = typeof window !== "undefined" && "speechSynthesis" in window;
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (!isSupported) return;
    const loadVoices = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
    };
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, [isSupported]);

  const cancel = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
  }, [isSupported]);

  const speak = useCallback(
    (text: string, onEnd?: () => void) => {
      if (!isSupported || !text.trim()) {
        onEnd?.();
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "de-DE";
      const voice = pickGermanVoice(voicesRef.current);
      if (voice) utterance.voice = voice;
      if (onEnd) {
        utterance.onend = () => onEnd();
        utterance.onerror = () => onEnd();
      }
      window.speechSynthesis.speak(utterance);
    },
    [isSupported]
  );

  return { isSupported, speak, cancel };
}
