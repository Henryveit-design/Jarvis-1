# Jarvis

Persönlicher Sprachassistent als installierbare PWA (Vite + React + TypeScript),
mit einer Vercel-Serverless-Function (`/api/chat`), die einen kostenlosen
Google-Gemini-API-Key serverseitig verwendet und die Antwort per SSE an die
App streamt.

## Inbetriebnahme

1. **Key setzen**: Auf [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
   kostenlos (kein Zahlungsmittel nötig) einen Gemini-API-Key erstellen. Dann in
   den Vercel-Projekteinstellungen unter *Settings → Environment Variables* eine
   Variable `GEMINI_API_KEY` mit diesem Key anlegen.
   (Für lokales Testen alternativ eine Datei `.env` mit `GEMINI_API_KEY=...`
   im Projektstamm anlegen – sie wird nicht eingecheckt und landet nie im
   Client-Bundle.)
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
- Musik/Links: Jarvis kann über das Tool `open_link` einen antippbaren
  Link-Knopf vorschlagen (z. B. eine Apple-Music-Suche). Als Web-App kann er
  keine anderen Apps fernsteuern oder Musik unsichtbar im Hintergrund starten
  – der Nutzer tippt den Knopf selbst an, dann übernimmt iOS die Weiterleitung
  in die passende App.
- Siri/Apple Shortcuts: `/api/ask` ist eine schlanke, nicht-streamende
  Variante von `/api/chat` (POST `{ text }` → `{ reply, link? }`), gedacht für
  Kurzbefehle. Bau-Anleitung für den "Hey Siri, frag Jarvis"-Kurzbefehl in
  [SHORTCUTS.md](./SHORTCUTS.md).

## Modell / Kosten

Backend nutzt Googles Gemini-API (`gemini-2.5-flash` per Default, per
`GEMINI_MODEL`-Env-Var überschreibbar) über deren kostenloses Kontingent –
kein Zahlungsmittel nötig, aber ein Tageslimit an Anfragen. Für den
persönlichen Gebrauch (ein paar Nachrichten am Tag) reicht das üblicherweise
locker. Falls Google den Modellnamen einmal ändert und `/api/chat` mit einem
"model not found"-Fehler antwortet: aktuellen Namen auf
[aistudio.google.com](https://aistudio.google.com) nachsehen und als
`GEMINI_MODEL` in Vercel setzen.
