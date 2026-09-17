# Jarvis über Siri ansprechen (Apple Shortcuts)

Das hier baust du einmal in der **Kurzbefehle**-App auf deinem iPad. Danach
kannst du "Hey Siri, frag Jarvis" sagen, ohne die App zu öffnen.

Wichtig zu wissen, bevor du loslegst:

- Dieser Weg nutzt **nicht** den Verlauf/die Aufgaben/Notizen aus der
  Jarvis-App – Kurzbefehle können nicht auf den Speicher der Web-App
  zugreifen. Jarvis kennt hier nur Datum und Uhrzeit.
- Du brauchst deine **Vercel-URL** (z. B. `https://jarvis-1-xyz.vercel.app`) –
  die findest du im Vercel-Dashboard oben auf der Projektseite.
- Vorausgesetzt: Der Key ist gesetzt und das Projekt ist deployt (siehe
  README, Schritt 1+2), sonst antwortet der Kurzbefehl mit einer Fehlermeldung.

## Schritt für Schritt

1. **Kurzbefehle**-App öffnen → oben rechts **"+"** → neuer Kurzbefehl.
2. Rechts oben auf den Namen tippen, umbenennen in **"Frag Jarvis"**.
3. Unten auf **"Aktion hinzufügen"** tippen, nach **"Diktat"** suchen, die
   Aktion **"Text diktieren"** hinzufügen.
   - Sprache: **Deutsch (Deutschland)**
   - "Beenden": **Nach Sprechpause**
4. **"Aktion hinzufügen"** → nach **"Inhalt von URL"** suchen → Aktion
   **"Inhalt von URL abrufen"** hinzufügen.
   - URL-Feld: `https://DEINE-VERCEL-URL.vercel.app/api/ask` (deine echte
     URL einsetzen)
   - Tippe auf **"Mehr anzeigen"** (Show More), darunter einstellen:
     - **Methode**: POST
     - **Kopfzeilen (Headers)**: einen Eintrag hinzufügen
       - Schlüssel: `Content-Type`
       - Wert: `application/json`
     - **Anfragetext (Request Body)**: **JSON** auswählen, dann
       **"Wörterbuch hinzufügen"** (Add new field):
       - Schlüssel: `text`
       - Wert: tippe ins Wertfeld, dann oben in der Variablen-Leiste die
         Variable **"Diktierter Text"** (Dictated Text) aus Schritt 3
         auswählen (nicht abtippen – als Variable einfügen!)
5. **"Aktion hinzufügen"** → **"Wert aus Wörterbuch abrufen"** (Get Dictionary
   Value) hinzufügen.
   - Schlüssel: `reply`
   - Wörterbuch: die Variable **"Inhalt von URL"** aus Schritt 4 einsetzen
6. **"Aktion hinzufügen"** → **"Text vorlesen"** (Speak Text) hinzufügen.
   - Text-Feld: die Variable aus Schritt 5 (der `reply`-Wert) einsetzen
   - Sprache: Deutsch
   - "Warten, bis beendet": **Ein**

Das ist die Grundversion – Testen kannst du sie jetzt schon (Punkt "Testen"
unten). Wenn du **"Spiel Bohemian Rhapsody"** sagst, bekommst du eine
gesprochene Antwort. Wenn du auch den Link-Knopf (Musik/Website) nutzen willst,
mach weiter mit Schritt 7–9:

7. Nach Schritt 5 (vor "Text vorlesen"), **"Aktion hinzufügen"** →
   **"Wert aus Wörterbuch abrufen"** noch einmal hinzufügen.
   - Schlüssel: `link`
   - Wörterbuch: wieder die Variable **"Inhalt von URL"** aus Schritt 4
8. **"Aktion hinzufügen"** → **"Wenn"** (If) hinzufügen.
   - Eingabe: die Variable aus Schritt 7
   - Bedingung: **"Hat einen Wert"** (Has Any Value)
9. In den **"Wenn"**-Zweig hinein:
   - **"Wert aus Wörterbuch abrufen"**: Schlüssel `url`, Wörterbuch = Variable
     aus Schritt 7
   - **"URLs öffnen"** (Open URLs): die eben geholte `url`-Variable

Die "Text vorlesen"-Aktion aus Schritt 6 bleibt außerhalb des "Wenn"-Blocks,
direkt danach – so spricht Jarvis immer, und öffnet zusätzlich den Link, wenn
einer da ist.

## Mit Siri verknüpfen

1. Im Kurzbefehl oben auf das **ⓘ**-Symbol tippen.
2. **"Zu Siri hinzufügen"** → sprich eine Phrase auf, z. B. **"Frag Jarvis"**.
3. Fertig. Ab jetzt: **"Hey Siri, frag Jarvis"** sagen, kurz warten bis der
   Diktat-Ton kommt, sprechen, fertig.

## Bekannte Grenzen (ehrlich, nicht schöngeredet)

- Kein Zugriff auf Verlauf/Aufgaben/Notizen der App (siehe oben).
- `/api/ask` ist aktuell **nicht** durch ein Passwort geschützt – wer deine
  Vercel-URL kennt, könnte sie ebenfalls aufrufen und Anthropic-Kosten
  verursachen. Sag Bescheid, falls ein einfacher Zugriffs-Token ergänzt
  werden soll.
- Musik/Websites öffnen sich nach Bestätigung durch den Kurzbefehl selbst
  (Schritt 9), nicht unsichtbar im Hintergrund – iOS erlaubt das aus
  Sicherheitsgründen keiner App.
