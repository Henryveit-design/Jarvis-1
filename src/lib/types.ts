export type Role = "user" | "assistant";

export interface LinkSuggestion {
  url: string;
  label: string;
}

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
  link?: LinkSuggestion;
}

export interface TaskItem {
  id: string;
  text: string;
  done: boolean;
  createdAt: number;
}

export interface Settings {
  speakReplies: boolean;
  handsFree: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  speakReplies: true,
  handsFree: false,
};
