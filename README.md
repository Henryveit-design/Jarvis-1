# Jarvis

Persönlicher Sprachassistent als installierbare PWA (Vite + React + TypeScript),
mit einer Vercel-Serverless-Function (`/api/chat`), die deinen Anthropic-API-Key
serverseitig verwendet und die Antwort per SSE an die App streamt.

## Inbetriebnahme

1. **Key setzen**: In den Vercel-Projekteinstellungen unter *Settings → Environment
   Variables* eine Variable `ANTHROPIC_API_KEY` mit deinem Anthropic-API-Key anlegen.
   (Für lokales Testen alternativ eine Datei `.env` mit `ANTHROPIC_API_KEY=sk-ant-...`
   im Projektstamm anlegen – sie wird nicht eingecheckt und landet nie im Client-Bundle.)
2. **Deployen**: Repository auf [vercel.com](https://vercel.com) importieren (oder
   `vercel --prod` mit der Vercel CLI ausführen). Vercel erkennt Vite automatisch
   und deployt `/api/chat` als Edge Function.
3. **Aufs iPad legen**: Die Vercel-URL in Safari öffnen, auf *Teilen* → *Zum
   Home-Bildschirm* tippen. Von dort startet Jarvis im Vollbild ohne Safari-Leiste.

## Lokale Entwicklung

```
npm install
npm run dev
```

`npm run dev` startet Vite und bedient `/api/chat` über eine eingebaute
Dev-Middleware (siehe `vite.config.ts`), sodass Streaming lokal genauso
funktioniert wie auf Vercel.

## Technik

- Sprechen: `webkitSpeechRecognition` (`de-DE`), Zwischenergebnisse live,
  automatisches Absenden beim Endergebnis. Tastatureingabe als Fallback, wenn
  Spracherkennung fehlt oder blockiert ist.
- Vorlesen: `speechSynthesis` mit deutscher Stimme, an/aus-Schalter mit
  gemerktem Zustand, neue Antwort bricht laufende Sprachausgabe ab.
- Freihändig-Modus: nach dem Vorlesen startet die Spracherkennung automatisch
  neu; bricht nach 10 Sekunden Stille oder beim Ausschalten ab.
- Gedächtnis: Verlauf, Aufgabenliste und ein Notizfeld liegen in IndexedDB und
  überleben Neustarts; offene Aufgaben und Notizen fließen in jeden
  Systemprompt ein.
- PWA: `manifest.webmanifest`, Icons (180/192/512 px), Service Worker für die
  App-Shell (API-Aufrufe werden nie gecacht), `viewport-fit=cover` mit
  `env(safe-area-inset-*)`.
- Websuche: das Anthropic-Tool `web_search` ist aktiviert, Jarvis kann also
  aktuelle Informationen nachschlagen.
- Musik/Links: Jarvis kann über das Tool `open_link` einen antippbaren
  Link-Knopf vorschlagen (z. B. eine Apple-Music-Suche). Als Web-App kann er
  keine anderen Apps fernsteuern oder Musik unsichtbar im Hintergrund starten
  – der Nutzer tippt den Knopf selbst an, dann übernimmt iOS die Weiterleitung
  in die passende App.
