const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

// Kostenloses Kontingent, kein Zahlungsmittel nötig. Überschreibbar per
// GEMINI_MODEL-Env-Var, falls Google den Modellnamen mal ändert oder ein
// neueres Flash-Modell im kostenlosen Kontingent verfügbar ist.
export const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
export const MAX_OUTPUT_TOKENS = 1024;

export const TOOLS = [
  {
    functionDeclarations: [
      {
        name: "open_link",
        description:
          "Schlägt dem Nutzer einen Link vor, den er selbst antippen bzw. öffnen kann, z. B. um Musik auf Apple Music zu suchen und abzuspielen (https://music.apple.com/search?term=...) oder eine Website zu öffnen. Der Link wird nicht automatisch geöffnet – schreib trotzdem immer einen kurzen gesprochenen Satz dazu, da du kein Ergebnis dieser Aktion zurückbekommst.",
        parameters: {
          type: "OBJECT",
          properties: {
            url: { type: "STRING", description: "Vollständige https-URL." },
            label: {
              type: "STRING",
              description: "Kurzer Knopftext, z. B. 'Auf Apple Music öffnen'.",
            },
          },
          required: ["url", "label"],
        },
      },
    ],
  },
];

export function errorResponse(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export function getApiKey(): string | null {
  return process.env.GEMINI_API_KEY ?? null;
}

export function buildGeminiUrl(
  action: "generateContent" | "streamGenerateContent",
  apiKey: string
): string {
  const streamParam = action === "streamGenerateContent" ? "alt=sse&" : "";
  return `${GEMINI_API_BASE}/${MODEL}:${action}?${streamParam}key=${encodeURIComponent(apiKey)}`;
}
