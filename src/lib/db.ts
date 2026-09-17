import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { DEFAULT_SETTINGS, type ChatMessage, type Settings, type TaskItem } from "./types";

interface JarvisDB extends DBSchema {
  messages: {
    key: string;
    value: ChatMessage;
    indexes: { "by-createdAt": number };
  };
  tasks: {
    key: string;
    value: TaskItem;
    indexes: { "by-createdAt": number };
  };
  kv: {
    key: string;
    value: unknown;
  };
}

const DB_NAME = "jarvis";
const DB_VERSION = 1;
const NOTES_KEY = "notes";
const SETTINGS_KEY = "settings";

let dbPromise: Promise<IDBPDatabase<JarvisDB>> | null = null;

function getDB(): Promise<IDBPDatabase<JarvisDB>> {
  if (!dbPromise) {
    dbPromise = openDB<JarvisDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const messages = db.createObjectStore("messages", { keyPath: "id" });
        messages.createIndex("by-createdAt", "createdAt");
        const tasks = db.createObjectStore("tasks", { keyPath: "id" });
        tasks.createIndex("by-createdAt", "createdAt");
        db.createObjectStore("kv");
      },
    });
  }
  return dbPromise;
}

export async function loadMessages(): Promise<ChatMessage[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex("messages", "by-createdAt");
  return all;
}

export async function saveMessage(message: ChatMessage): Promise<void> {
  const db = await getDB();
  await db.put("messages", message);
}

export async function updateMessageContent(id: string, content: string): Promise<void> {
  const db = await getDB();
  const existing = await db.get("messages", id);
  if (!existing) return;
  await db.put("messages", { ...existing, content });
}

export async function clearMessages(): Promise<void> {
  const db = await getDB();
  await db.clear("messages");
}

export async function loadTasks(): Promise<TaskItem[]> {
  const db = await getDB();
  return db.getAllFromIndex("tasks", "by-createdAt");
}

export async function saveTask(task: TaskItem): Promise<void> {
  const db = await getDB();
  await db.put("tasks", task);
}

export async function deleteTask(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("tasks", id);
}

export async function loadNotes(): Promise<string> {
  const db = await getDB();
  const value = await db.get("kv", NOTES_KEY);
  return typeof value === "string" ? value : "";
}

export async function saveNotes(notes: string): Promise<void> {
  const db = await getDB();
  await db.put("kv", notes, NOTES_KEY);
}

export async function loadSettings(): Promise<Settings> {
  const db = await getDB();
  const value = await db.get("kv", SETTINGS_KEY);
  if (value && typeof value === "object") {
    return { ...DEFAULT_SETTINGS, ...(value as Partial<Settings>) };
  }
  return DEFAULT_SETTINGS;
}

export async function saveSettings(settings: Settings): Promise<void> {
  const db = await getDB();
  await db.put("kv", settings, SETTINGS_KEY);
}
