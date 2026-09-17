import { MAX_OUTPUT_TOKENS, TOOLS, buildGeminiUrl, errorResponse, getApiKey } from "./_shared.ts";

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

function toGeminiContents(messages: ChatMessage[]): unknown[] {
  return messages.map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content }],
  }));
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return errorResponse(405, "Nur POST wird unterstützt.");
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    return errorResponse(500, "GEMINI_API_KEY ist auf dem Server nicht gesetzt.");
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
    upstream = await fetch(buildGeminiUrl("streamGenerateContent", apiKey), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: parsed.system }] },
        contents: toGeminiContents(parsed.messages),
        tools: TOOLS,
        generationConfig: { maxOutputTokens: MAX_OUTPUT_TOKENS },
      }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unbekannter Netzwerkfehler.";
    return errorResponse(502, `Gemini-API nicht erreichbar: ${message}`);
  }

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text();
    return errorResponse(upstream.status, `Gemini-API-Fehler: ${text}`);
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
