import { MAX_OUTPUT_TOKENS, TOOLS, buildGeminiUrl, errorResponse, getApiKey } from "./_shared.ts";

export const config = { runtime: "edge" };

interface AskRequestBody {
  text: string;
}

interface GeminiPart {
  text?: string;
  functionCall?: { name: string; args: unknown };
}

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: GeminiPart[] } }>;
}

interface LinkSuggestion {
  url: string;
  label: string;
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

Du läufst als API und kannst keine anderen Apps fernsteuern oder unsichtbar im Hintergrund etwas abspielen. Wenn der Nutzer Musik hören möchte oder eine Website öffnen will, ruf das Werkzeug open_link mit einer passenden https-URL auf (für Musik z. B. https://music.apple.com/search?term=<Suchbegriff>) und schreib trotzdem einen kurzen gesprochenen Satz dazu.

Heute ist ${dateStr}, es ist ${timeStr} Uhr.`;
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return errorResponse(405, "Nur POST wird unterstützt.");
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    return errorResponse(500, "GEMINI_API_KEY ist auf dem Server nicht gesetzt.");
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
    upstream = await fetch(buildGeminiUrl("generateContent", apiKey), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: buildSystemPrompt() }] },
        contents: [{ role: "user", parts: [{ text: parsed.text }] }],
        tools: TOOLS,
        generationConfig: { maxOutputTokens: MAX_OUTPUT_TOKENS },
      }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unbekannter Netzwerkfehler.";
    return errorResponse(502, `Gemini-API nicht erreichbar: ${message}`);
  }

  if (!upstream.ok) {
    const text = await upstream.text();
    return errorResponse(upstream.status, `Gemini-API-Fehler: ${text}`);
  }

  let data: GeminiResponse;
  try {
    data = (await upstream.json()) as GeminiResponse;
  } catch {
    return errorResponse(502, "Gemini-API hat kein gültiges JSON geliefert.");
  }

  const parts = data.candidates?.[0]?.content?.parts ?? [];

  const reply =
    parts
      .filter((part): part is GeminiPart & { text: string } => typeof part.text === "string")
      .map((part) => part.text)
      .join(" ")
      .trim() || "Ich konnte darauf gerade keine Antwort geben.";

  const toolCall = parts.find((part) => part.functionCall?.name === "open_link");
  const link =
    toolCall?.functionCall && isLinkSuggestion(toolCall.functionCall.args)
      ? toolCall.functionCall.args
      : undefined;

  return new Response(JSON.stringify({ reply, link }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
