import { useEffect, useRef } from "react";
import type { ChatMessage } from "../lib/types";

interface ConversationViewProps {
  messages: ChatMessage[];
  isStreaming: boolean;
}

function Bubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex flex-col gap-2 ${isUser ? "items-end" : "items-start"}`}>
      {message.content && (
        <p
          className={`max-w-[65ch] whitespace-pre-wrap font-serif text-[1.05rem] leading-relaxed ${
            isUser ? "text-ink-dim" : "text-ink"
          }`}
        >
          {message.content}
        </p>
      )}
      {message.link && (
        <a
          href={message.link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="min-h-11 inline-flex items-center rounded-full border border-ocher-dim bg-ocher/10 px-4 text-sm font-sans text-ocher-bright hover:bg-ocher/20"
        >
          ▸ {message.link.label}
        </a>
      )}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start" aria-label="Jarvis antwortet" role="status">
      <div className="flex items-center gap-1 py-1">
        <span className="typing-dot h-2 w-2 rounded-full bg-ink-dim" />
        <span className="typing-dot h-2 w-2 rounded-full bg-ink-dim [animation-delay:0.2s]" />
        <span className="typing-dot h-2 w-2 rounded-full bg-ink-dim [animation-delay:0.4s]" />
      </div>
    </div>
  );
}

export default function ConversationView({ messages, isStreaming }: ConversationViewProps) {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, isStreaming]);

  const lastMessage = messages[messages.length - 1];
  const showTypingIndicator = isStreaming && (!lastMessage || lastMessage.content === "");

  return (
    <div className="flex-1 overflow-y-auto bg-slate px-3 py-4 md:px-6">
      <div className="mx-auto flex min-h-full max-w-3xl flex-col gap-4 rounded-2xl border border-slate-lighter bg-paper px-5 py-6 md:px-8">
        {messages.length === 0 ? (
          <p className="font-serif text-[1.05rem] leading-relaxed text-ink-dim">
            Tipp aufs Mikro und sag, was du brauchst.
          </p>
        ) : (
          messages.map((message) => <Bubble key={message.id} message={message} />)
        )}
        {showTypingIndicator && <TypingIndicator />}
        <div ref={endRef} />
      </div>
    </div>
  );
}
