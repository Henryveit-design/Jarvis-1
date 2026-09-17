import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv, type Plugin } from "vite";
import chatHandler from "./api/chat.ts";
import askHandler from "./api/ask.ts";

type EdgeHandler = (request: Request) => Promise<Response>;

function edgeDevMiddleware(path: string, handler: EdgeHandler): Plugin {
  return {
    name: `api-dev-middleware${path.replace(/\//g, "-")}`,
    configureServer(server) {
      server.middlewares.use(path, async (req, res) => {
        try {
          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(chunk as Buffer);
          const body = Buffer.concat(chunks);

          const headers = new Headers();
          for (const [key, value] of Object.entries(req.headers)) {
            if (typeof value === "string") headers.set(key, value);
          }

          const request = new Request(`http://localhost${req.url ?? path}`, {
            method: req.method,
            headers,
            body: body.length > 0 ? body : undefined,
          });

          const response = await handler(request);
          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));

          if (response.body) {
            const reader = response.body.getReader();
            for (;;) {
              const { done, value } = await reader.read();
              if (done) break;
              res.write(value);
            }
          }
          res.end();
        } catch (error) {
          res.statusCode = 500;
          res.setHeader("content-type", "application/json");
          const message = error instanceof Error ? error.message : "Unbekannter Fehler.";
          res.end(JSON.stringify({ error: message }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  if (env.ANTHROPIC_API_KEY) process.env.ANTHROPIC_API_KEY = env.ANTHROPIC_API_KEY;

  return {
    plugins: [
      react(),
      tailwindcss(),
      edgeDevMiddleware("/api/chat", chatHandler),
      edgeDevMiddleware("/api/ask", askHandler),
    ],
  };
});
