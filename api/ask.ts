import { ANTHROPIC_URL, MAX_TOKENS, MODEL, TOOLS, errorResponse, getApiKey } from "./_shared.ts";

export const config = { runtime: "edge" };

interface AskRequestBody {
  text: string;
}

interface TextBlock {
  type: "text";
  text: string;
}

interface ToolUseBlock {
  type: "tool_use";
  name: string;
  input: unknown;
}

type ContentBlock = TextBlock | ToolUseBlock | { type: string };

interface AnthropicResponse {
  content: ContentBlock[];
}

interface LinkSuggestion {
  url: string;
  label: string;
}

function isTextBlock(block: ContentBlock): block is TextBlock {
  return block.type === "text" && typeof (block as TextBlock).text === "string";
}

function isToolUseBlock(block: ContentBlock): block is ToolUseBlock {
  return block.type === "tool_use" && typeof (block as ToolUseBlock).name === "string";
}

function isLinkSuggestion(value: unknown): value is LinkSuggestion {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.url === "string" && typeof record.label === "string";
}

function parseBody(value: unknown): AskRequestBody | null {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.text !== "string" || !record.text.trim()) return null;
  return { text: record.text };
}

function buildSystemPrompt(): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString("de-DE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeStr = now.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

  return `Du bist Jarvis, ein persönlicher Sprachassistent. Du sprichst Deutsch, duzt den Nutzer, antwortest knapp und in ganzen Sätzen ohne Floskeln, weil deine Antwort von Siri vorgelesen wird. Keine Aufzählungszeichen oder Markdown.

Du wirst hier über eine Apple-Kurzbefehle-Anfrage angesprochen, nicht über die Jarvis-App – du kennst deshalb weder den bisherigen Gesprächsverlauf noch gespeicherte Aufgaben oder Notizen des Nutzers.

Du läufst als API und kannst keine anderen Apps fernsteuern oder unsichtbar im Hintergrund etwas abspielen. Wenn der Nutzer Musik hören möchte oder eine Website öffnen will, ruf das Werkzeug open_link mit einer passenden https-URL auf (für Musik z. B. https://music.apple.com/search?term=<Suchbegriff>) und schreib trotzdem einen kurzen gesprochenen Satz dazu. Für aktuelle Informationen aus dem Internet nutzt du web_search.

Heute ist ${dateStr}, es ist ${timeStr} Uhr.`;
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return errorResponse(405, "Nur POST wird unterstützt.");
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    return errorResponse(500, "ANTHROPIC_API_KEY ist auf dem Server nicht gesetzt.");
  }

  let parsed: AskRequestBody | null;
  try {
    const json: unknown = await request.json();
    parsed = parseBody(json);
  } catch {
    return errorResponse(400, "Ungültiges JSON im Request-Body.");
  }

  if (!parsed) {
    return errorResponse(400, "Erwartet { text: string }.");
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
        system: buildSystemPrompt(),
        messages: [{ role: "user", content: parsed.text }],
        stream: false,
        tools: TOOLS,
      }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unbekannter Netzwerkfehler.";
    return errorResponse(502, `Anthropic-API nicht erreichbar: ${message}`);
  }

  if (!upstream.ok) {
    const text = await upstream.text();
    return errorResponse(upstream.status, `Anthropic-API-Fehler: ${text}`);
  }

  let data: AnthropicResponse;
  try {
    data = (await upstream.json()) as AnthropicResponse;
  } catch {
    return errorResponse(502, "Anthropic-API hat kein gültiges JSON geliefert.");
  }

  const reply = data.content
    .filter(isTextBlock)
    .map((block) => block.text)
    .join(" ")
    .trim();

  const toolUse = data.content.find(
    (block): block is ToolUseBlock => isToolUseBlock(block) && block.name === "open_link"
  );
  const link = toolUse && isLinkSuggestion(toolUse.input) ? toolUse.input : undefined;

  return new Response(JSON.stringify({ reply, link }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
