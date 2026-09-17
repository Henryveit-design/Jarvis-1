import type { TaskItem } from "./types";

export function buildSystemPrompt(tasks: TaskItem[], notes: string): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString("de-DE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeStr = now.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

  const openTasks = tasks.filter((task) => !task.done);
  const taskLines =
    openTasks.length > 0
      ? openTasks.map((task) => `- ${task.text}`).join("\n")
      : "- (keine offenen Aufgaben)";

  const notesBlock = notes.trim() ? notes.trim() : "(keine Notizen)";

  return `Du bist Jarvis, ein persönlicher Sprachassistent. Du sprichst Deutsch, duzt den Nutzer, antwortest knapp und in ganzen Sätzen ohne Floskeln, weil deine Antwort vorgelesen wird. Keine Aufzählungszeichen oder Markdown, da es gesprochen wird.

Heute ist ${dateStr}, es ist ${timeStr} Uhr.

Offene Aufgaben:
${taskLines}

Notizen:
${notesBlock}`;
}
