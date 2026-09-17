export const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
export const MODEL = "claude-sonnet-5";
export const MAX_TOKENS = 1024;

export const TOOLS = [
  { type: "web_search_20250305", name: "web_search" },
  {
    name: "open_link",
    description:
      "Schlägt dem Nutzer einen Link vor, den er selbst antippen bzw. öffnen kann, z. B. um Musik auf Apple Music zu suchen und abzuspielen (https://music.apple.com/search?term=...) oder eine Website zu öffnen. Der Link wird nicht automatisch geöffnet – schreib trotzdem immer einen kurzen gesprochenen Satz dazu, da du kein Ergebnis dieser Aktion zurückbekommst.",
    input_schema: {
      type: "object",
      properties: {
        url: { type: "string", description: "Vollständige https-URL." },
        label: {
          type: "string",
          description: "Kurzer Knopftext, z. B. 'Auf Apple Music öffnen'.",
        },
      },
      required: ["url", "label"],
    },
  },
];

export function errorResponse(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export function getApiKey(): string | null {
  return process.env.ANTHROPIC_API_KEY ?? null;
}
