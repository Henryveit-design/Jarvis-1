import { useState, type FormEvent, type KeyboardEvent } from "react";

interface ComposerProps {
  onSend: (text: string) => void;
  disabled: boolean;
  isSupported: boolean;
  isListening: boolean;
  interimTranscript: string;
  micError: string;
  streamError: string;
  onMicToggle: () => void;
}

export default function Composer({
  onSend,
  disabled,
  isSupported,
  isListening,
  interimTranscript,
  micError,
  streamError,
  onMicToggle,
}: ComposerProps) {
  const [text, setText] = useState("");

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  const errorText = micError || streamError;

  return (
    <div
      className="border-t border-slate-lighter bg-slate px-3 py-3 md:px-6"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      {errorText && (
        <p role="alert" className="mx-auto mb-2 max-w-3xl text-sm text-ocher-bright">
          {errorText}
        </p>
      )}
      {isListening && (
        <p className="mx-auto mb-2 max-w-3xl text-sm text-paper/60">
          {interimTranscript || "Höre zu…"}
        </p>
      )}
      <form onSubmit={handleSubmit} className="mx-auto flex max-w-3xl items-end gap-2">
        <button
          type="button"
          onClick={onMicToggle}
          disabled={!isSupported || disabled}
          aria-pressed={isListening}
          aria-label={isListening ? "Mikrofon stoppen" : "Mikrofon starten"}
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full border transition-colors motion-reduce:transition-none disabled:opacity-40 ${
            isListening
              ? "border-ocher-bright bg-ocher text-slate"
              : "border-ocher-dim bg-transparent text-ocher-bright hover:bg-ocher/10"
          }`}
        >
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" aria-hidden="true">
            <rect x="9" y="2" width="6" height="12" rx="3" fill="currentColor" />
            <path
              d="M5 11a7 7 0 0 0 14 0M12 18v3"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="Nachricht eingeben…"
          className="min-h-11 min-w-0 flex-1 resize-none rounded-xl border border-slate-lighter bg-paper px-4 py-3 text-base text-ink placeholder:text-ink-dim/60"
        />
        <button
          type="submit"
          disabled={disabled || !text.trim()}
          className="min-h-11 shrink-0 rounded-xl bg-ocher px-4 text-sm font-medium text-slate disabled:opacity-40"
        >
          Senden
        </button>
      </form>
    </div>
  );
}
