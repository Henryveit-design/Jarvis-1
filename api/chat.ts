import { ANTHROPIC_URL, MAX_TOKENS, MODEL, TOOLS, errorResponse, getApiKey } from "./_shared.ts";

export const config = { runtime: "edge" };

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequestBody {
  messages: ChatMessage[];
  system: string;
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    (record.role === "user" || record.role === "assistant") &&
    typeof record.content === "string"
  );
}

function parseBody(value: unknown): ChatRequestBody | null {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.system !== "string") return null;
  if (!Array.isArray(record.messages)) return null;
  if (!record.messages.every(isChatMessage)) return null;
  return { messages: record.messages, system: record.system };
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return errorResponse(405, "Nur POST wird unterstützt.");
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    return errorResponse(500, "ANTHROPIC_API_KEY ist auf dem Server nicht gesetzt.");
  }

  let parsed: ChatRequestBody | null;
  try {
    const json: unknown = await request.json();
    parsed = parseBody(json);
  } catch {
    return errorResponse(400, "Ungültiges JSON im Request-Body.");
  }

  if (!parsed) {
    return errorResponse(400, "Erwartet { messages: {role, content}[], system: string }.");
  }

  let upstream: Response;
  try {
    upstream = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: parsed.system,
        messages: parsed.messages,
        stream: true,
        tools: TOOLS,
      }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unbekannter Netzwerkfehler.";
    return errorResponse(502, `Anthropic-API nicht erreichbar: ${message}`);
  }

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text();
    return errorResponse(upstream.status, `Anthropic-API-Fehler: ${text}`);
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}
