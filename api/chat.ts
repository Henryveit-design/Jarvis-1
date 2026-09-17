export const config = { runtime: "edge" };

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-5";
const MAX_TOKENS = 1024;

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

function errorResponse(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return errorResponse(405, "Nur POST wird unterstützt.");
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
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
        tools: [{ type: "web_search_20250305", name: "web_search" }],
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
