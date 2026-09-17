interface ContentBlockStartEvent {
  type: "content_block_start";
  index: number;
  content_block: { type: string; id?: string; name?: string };
}

interface ContentBlockDeltaEvent {
  type: "content_block_delta";
  index: number;
  delta: { type: string; text?: string; partial_json?: string };
}

interface ContentBlockStopEvent {
  type: "content_block_stop";
  index: number;
}

interface UnknownStreamEvent {
  type: string;
}

type StreamEvent =
  | ContentBlockStartEvent
  | ContentBlockDeltaEvent
  | ContentBlockStopEvent
  | UnknownStreamEvent;

function isContentBlockStart(event: StreamEvent): event is ContentBlockStartEvent {
  return event.type === "content_block_start";
}

function isContentBlockDelta(event: StreamEvent): event is ContentBlockDeltaEvent {
  return event.type === "content_block_delta";
}

function isContentBlockStop(event: StreamEvent): event is ContentBlockStopEvent {
  return event.type === "content_block_stop";
}

import type { LinkSuggestion } from "./types";

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

interface OpenToolUseBlock {
  kind: "tool_use";
  name: string;
  json: string;
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
  const openToolBlocks = new Map<number, OpenToolUseBlock>();

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

        let event: StreamEvent;
        try {
          event = JSON.parse(jsonText) as StreamEvent;
        } catch {
          continue;
        }

        if (isContentBlockStart(event) && event.content_block.type === "tool_use") {
          openToolBlocks.set(event.index, {
            kind: "tool_use",
            name: event.content_block.name ?? "",
            json: "",
          });
          continue;
        }

        if (isContentBlockDelta(event)) {
          if (event.delta.type === "text_delta") {
            callbacks.onDelta(event.delta.text ?? "");
          } else if (event.delta.type === "input_json_delta") {
            const open = openToolBlocks.get(event.index);
            if (open) open.json += event.delta.partial_json ?? "";
          }
          continue;
        }

        if (isContentBlockStop(event)) {
          const open = openToolBlocks.get(event.index);
          if (open && open.name === "open_link") {
            try {
              const input: unknown = JSON.parse(open.json);
              if (isLinkSuggestion(input)) callbacks.onToolUse(input);
            } catch {
              // unvollständiges oder ungültiges JSON vom Modell, ignorieren
            }
          }
          openToolBlocks.delete(event.index);
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
