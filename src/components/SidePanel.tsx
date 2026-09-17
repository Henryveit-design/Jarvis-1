import { useState, type FormEvent } from "react";
import type { TaskItem } from "../lib/types";

interface SidePanelProps {
  open: boolean;
  tasks: TaskItem[];
  notes: string;
  onAddTask: (text: string) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onNotesChange: (notes: string) => void;
}

export default function SidePanel({
  open,
  tasks,
  notes,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onNotesChange,
}: SidePanelProps) {
  const [draft, setDraft] = useState("");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;
    onAddTask(trimmed);
    setDraft("");
  };

  return (
    <aside
      className={`${
        open ? "flex" : "hidden"
      } w-full min-w-0 flex-col gap-6 border-slate-lighter bg-slate-light px-4 py-4 md:flex md:w-80 md:shrink-0 md:border-l md:px-5 md:py-6`}
    >
      <section aria-labelledby="tasks-heading" className="flex flex-col gap-3">
        <h2 id="tasks-heading" className="text-base font-medium text-paper">
          Aufgaben
        </h2>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Neue Aufgabe…"
            className="min-h-11 min-w-0 flex-1 rounded-lg border border-slate-lighter bg-paper px-3 text-base text-ink placeholder:text-ink-dim/60"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            className="min-h-11 shrink-0 rounded-lg bg-ocher px-3 text-sm font-medium text-slate disabled:opacity-40"
          >
            Hinzufügen
          </button>
        </form>
        <ul className="flex flex-col gap-2">
          {tasks.length === 0 && <li className="text-sm text-paper/50">Keine Aufgaben.</li>}
          {tasks.map((task) => (
            <li key={task.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={task.done}
                onChange={() => onToggleTask(task.id)}
                aria-label={`${task.text} als erledigt markieren`}
                className="h-5 w-5 shrink-0 accent-ocher"
              />
              <span
                className={`flex-1 text-sm ${
                  task.done ? "text-paper/40 line-through" : "text-paper/90"
                }`}
              >
                {task.text}
              </span>
              <button
                type="button"
                onClick={() => onDeleteTask(task.id)}
                aria-label={`${task.text} entfernen`}
                className="flex h-11 w-11 shrink-0 items-center justify-center text-paper/50 hover:text-danger"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="notes-heading" className="flex flex-1 flex-col gap-3">
        <h2 id="notes-heading" className="text-base font-medium text-paper">
          Notizen
        </h2>
        <textarea
          value={notes}
          onChange={(event) => onNotesChange(event.target.value)}
          placeholder="Freie Notizen für Jarvis…"
          className="min-h-32 flex-1 resize-none rounded-lg border border-slate-lighter bg-paper px-3 py-2 text-base text-ink placeholder:text-ink-dim/60"
        />
      </section>
    </aside>
  );
}
