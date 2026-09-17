import type { LinkSuggestion } from "./types";

interface GeminiPart {
  text?: string;
  functionCall?: { name: string; args: unknown };
}

interface GeminiStreamChunk {
  candidates?: Array<{ content?: { parts?: GeminiPart[] } }>;
}

function isLinkSuggestion(value: unknown): value is LinkSuggestion {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.url === "string" && typeof record.label === "string";
}

export interface ChatStreamCallbacks {
  onDelta: (text: string) => void;
  onToolUse: (link: LinkSuggestion) => void;
  onDone: () => void;
  onError: (message: string) => void;
}

export interface ChatStreamMessage {
  role: "user" | "assistant";
  content: string;
}

export async function streamChat(
  messages: ChatStreamMessage[],
  system: string,
  callbacks: ChatStreamCallbacks,
  signal?: AbortSignal
): Promise<void> {
  let response: Response;
  try {
    response = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages, system }),
      signal,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unbekannter Fehler.";
    callbacks.onError(`Server nicht erreichbar: ${message}`);
    return;
  }

  if (!response.ok || !response.body) {
    let detail = `HTTP ${response.status}`;
    try {
      const json: unknown = await response.json();
      if (json && typeof json === "object" && "error" in json) {
        const errorValue = (json as { error: unknown }).error;
        if (typeof errorValue === "string") detail = errorValue;
      }
    } catch {
      // response body war kein JSON, HTTP-Status als Meldung belassen
    }
    callbacks.onError(detail);
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const blocks = buffer.split("\n\n");
      buffer = blocks.pop() ?? "";

      for (const block of blocks) {
        const dataLine = block
          .split("\n")
          .find((line) => line.startsWith("data:"));
        if (!dataLine) continue;
        const jsonText = dataLine.slice("data:".length).trim();
        if (!jsonText) continue;

        let chunk: GeminiStreamChunk;
        try {
          chunk = JSON.parse(jsonText) as GeminiStreamChunk;
        } catch {
          continue;
        }

        const parts = chunk.candidates?.[0]?.content?.parts ?? [];
        for (const part of parts) {
          if (typeof part.text === "string") {
            callbacks.onDelta(part.text);
          } else if (part.functionCall?.name === "open_link") {
            if (isLinkSuggestion(part.functionCall.args)) {
              callbacks.onToolUse(part.functionCall.args);
            }
          }
        }
      }
    }
    callbacks.onDone();
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return;
    const message = error instanceof Error ? error.message : "Verbindung unterbrochen.";
    callbacks.onError(message);
  }
}
