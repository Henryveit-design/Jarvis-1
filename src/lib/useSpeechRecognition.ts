import { useCallback, useEffect, useRef, useState } from "react";

const SILENCE_TIMEOUT_MS = 10_000;

function getRecognitionConstructor(): (new () => SpeechRecognition) | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

function describeError(code: string): string {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "Zugriff aufs Mikrofon wurde blockiert. Bitte in den Safari-Einstellungen erlauben.";
    case "no-speech":
      return "Ich habe nichts gehört. Versuch es noch einmal.";
    case "audio-capture":
      return "Kein Mikrofon gefunden.";
    case "network":
      return "Netzwerkfehler bei der Spracherkennung.";
    case "aborted":
      return "";
    default:
      return `Spracherkennung fehlgeschlagen (${code}).`;
  }
}

export interface UseSpeechRecognition {
  isSupported: boolean;
  isListening: boolean;
  interimTranscript: string;
  error: string;
  start: () => void;
  stop: () => void;
}

export function useSpeechRecognition(
  onFinalResult: (transcript: string) => void
): UseSpeechRecognition {
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onFinalResultRef = useRef(onFinalResult);
  useEffect(() => {
    onFinalResultRef.current = onFinalResult;
  }, [onFinalResult]);

  const Constructor = getRecognitionConstructor();
  const isSupported = Constructor !== null;

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current !== null) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const armSilenceTimer = useCallback(() => {
    clearSilenceTimer();
    silenceTimerRef.current = setTimeout(() => {
      recognitionRef.current?.stop();
    }, SILENCE_TIMEOUT_MS);
  }, [clearSilenceTimer]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const start = useCallback(() => {
    if (!Constructor) {
      setError("Spracherkennung wird von diesem Browser nicht unterstützt.");
      return;
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    const recognition = new Constructor();
    recognition.lang = "de-DE";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setInterimTranscript("");
      setError("");
      armSilenceTimer();
    };

    recognition.onresult = (event) => {
      armSilenceTimer();
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const transcript = result[0]?.transcript ?? "";
        if (result.isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }
      if (final.trim()) {
        setInterimTranscript("");
        onFinalResultRef.current(final.trim());
      } else {
        setInterimTranscript(interim);
      }
    };

    recognition.onerror = (event) => {
      const message = describeError(event.error);
      if (message) setError(message);
    };

    recognition.onend = () => {
      clearSilenceTimer();
      setIsListening(false);
      setInterimTranscript("");
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [Constructor, armSilenceTimer, clearSilenceTimer]);

  useEffect(() => {
    return () => {
      clearSilenceTimer();
      recognitionRef.current?.stop();
    };
  }, [clearSilenceTimer]);

  return { isSupported, isListening, interimTranscript, error, start, stop };
}
