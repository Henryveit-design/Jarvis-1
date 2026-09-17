import { useEffect, useRef, useState } from "react";
import TopBar from "./components/TopBar";
import ConversationView from "./components/ConversationView";
import Composer from "./components/Composer";
import SidePanel from "./components/SidePanel";
import { streamChat } from "./lib/chatStream";
import { buildSystemPrompt } from "./lib/systemPrompt";
import { useSpeechRecognition } from "./lib/useSpeechRecognition";
import { useSpeechSynthesis } from "./lib/useSpeechSynthesis";
import {
  clearMessages,
  deleteTask as dbDeleteTask,
  loadMessages,
  loadNotes,
  loadSettings,
  loadTasks,
  saveMessage,
  saveNotes,
  saveSettings,
  saveTask,
} from "./lib/db";
import { DEFAULT_SETTINGS, type ChatMessage, type Settings, type TaskItem } from "./lib/types";

function generateId(): string {
  return crypto.randomUUID();
}

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [notes, setNotes] = useState("");
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isReady, setIsReady] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamError, setStreamError] = useState("");
  const [sidePanelOpen, setSidePanelOpen] = useState(false);

  const tasksRef = useRef(tasks);
  const notesRef = useRef(notes);
  const messagesRef = useRef(messages);
  const settingsRef = useRef(settings);

  useEffect(() => {
    tasksRef.current = tasks;
    notesRef.current = notes;
    messagesRef.current = messages;
    settingsRef.current = settings;
  }, [tasks, notes, messages, settings]);

  const synthesis = useSpeechSynthesis();

  const recognition = useSpeechRecognition((transcript) => {
    sendMessage(transcript);
  });

  useEffect(() => {
    (async () => {
      const [loadedMessages, loadedTasks, loadedNotes, loadedSettings] = await Promise.all([
        loadMessages(),
        loadTasks(),
        loadNotes(),
        loadSettings(),
      ]);
      setMessages(loadedMessages);
      setTasks(loadedTasks);
      setNotes(loadedNotes);
      setSettings(loadedSettings);
      setIsReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!isReady) return;
    const timer = setTimeout(() => {
      saveNotes(notes).catch(() => undefined);
    }, 500);
    return () => clearTimeout(timer);
  }, [notes, isReady]);

  useEffect(() => {
    if (!isReady) return;
    saveSettings(settings).catch(() => undefined);
  }, [settings, isReady]);

  function afterReply(content: string) {
    const shouldSpeak = settingsRef.current.speakReplies && synthesis.isSupported;
    const restartIfHandsFree = () => {
      if (settingsRef.current.handsFree && recognition.isSupported) {
        recognition.start();
      }
    };
    if (shouldSpeak) {
      synthesis.speak(content, restartIfHandsFree);
    } else {
      restartIfHandsFree();
    }
  }

  function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;

    if (recognition.isListening) recognition.stop();
    synthesis.cancel();
    setStreamError("");

    const userMessage: ChatMessage = {
      id: generateId(),
      role: "user",
      content: trimmed,
      createdAt: Date.now(),
    };
    const assistantId = generateId();
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      createdAt: Date.now(),
    };

    const history = [...messagesRef.current, userMessage];
    setMessages([...history, assistantMessage]);
    saveMessage(userMessage).catch(() => undefined);

    const apiMessages = history.map((message) => ({
      role: message.role,
      content: message.content,
    }));
    const system = buildSystemPrompt(tasksRef.current, notesRef.current);

    setIsStreaming(true);

    let finalContent = "";
    streamChat(apiMessages, system, {
      onDelta: (delta) => {
        finalContent += delta;
        setMessages((prev) =>
          prev.map((message) =>
            message.id === assistantId ? { ...message, content: finalContent } : message
          )
        );
      },
      onDone: () => {
        setIsStreaming(false);
        if (finalContent.trim()) {
          saveMessage({ ...assistantMessage, content: finalContent }).catch(() => undefined);
          afterReply(finalContent);
        } else {
          setMessages((prev) => prev.filter((message) => message.id !== assistantId));
        }
      },
      onError: (message) => {
        setIsStreaming(false);
        setStreamError(message);
        setMessages((prev) =>
          finalContent.trim()
            ? prev
            : prev.filter((entry) => entry.id !== assistantId)
        );
        if (finalContent.trim()) {
          saveMessage({ ...assistantMessage, content: finalContent }).catch(() => undefined);
        }
      },
    });
  }

  function handleMicToggle() {
    if (recognition.isListening) {
      recognition.stop();
    } else {
      synthesis.cancel();
      recognition.start();
    }
  }

  function handleToggleSpeak() {
    setSettings((prev) => ({ ...prev, speakReplies: !prev.speakReplies }));
    synthesis.cancel();
  }

  function handleToggleHandsFree() {
    setSettings((prev) => {
      const next = { ...prev, handsFree: !prev.handsFree };
      if (!next.handsFree && recognition.isListening) recognition.stop();
      return next;
    });
  }

  async function handleClearHistory() {
    if (!window.confirm("Verlauf wirklich löschen?")) return;
    setMessages([]);
    await clearMessages();
  }

  function handleAddTask(text: string) {
    const task: TaskItem = { id: generateId(), text, done: false, createdAt: Date.now() };
    setTasks((prev) => [...prev, task]);
    saveTask(task).catch(() => undefined);
  }

  function handleToggleTask(id: string) {
    setTasks((prev) => {
      const next = prev.map((task) => (task.id === id ? { ...task, done: !task.done } : task));
      const updated = next.find((task) => task.id === id);
      if (updated) saveTask(updated).catch(() => undefined);
      return next;
    });
  }

  function handleDeleteTask(id: string) {
    setTasks((prev) => prev.filter((task) => task.id !== id));
    dbDeleteTask(id).catch(() => undefined);
  }

  return (
    <div
      className="flex h-dvh flex-col bg-slate md:flex-row"
      style={{
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          speakReplies={settings.speakReplies}
          handsFree={settings.handsFree}
          onToggleSpeak={handleToggleSpeak}
          onToggleHandsFree={handleToggleHandsFree}
          onClearHistory={handleClearHistory}
          onToggleSidePanel={() => setSidePanelOpen((open) => !open)}
          sidePanelOpen={sidePanelOpen}
        />
        <ConversationView messages={messages} isStreaming={isStreaming} />
        <Composer
          onSend={sendMessage}
          disabled={isStreaming}
          isSupported={recognition.isSupported}
          isListening={recognition.isListening}
          interimTranscript={recognition.interimTranscript}
          micError={recognition.error}
          streamError={streamError}
          onMicToggle={handleMicToggle}
        />
      </div>
      <SidePanel
        open={sidePanelOpen}
        tasks={tasks}
        notes={notes}
        onAddTask={handleAddTask}
        onToggleTask={handleToggleTask}
        onDeleteTask={handleDeleteTask}
        onNotesChange={setNotes}
      />
    </div>
  );
}
