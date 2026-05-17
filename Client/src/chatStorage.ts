import type { ChatMessage, ChatSession, ChatStore } from "./types";

const STORE_KEY = "chatStore";
const LEGACY_KEY = "chatHistory";

export function deriveChatTitle(messages: ChatMessage[]) {
  const firstUser = messages.find((m) => m.role === "user");
  if (!firstUser?.content.trim()) return "New chat";

  const text = firstUser.content.trim();
  return text.length > 48 ? `${text.slice(0, 48)}…` : text;
}

export function createChatSession(messages: ChatMessage[] = []): ChatSession {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title: deriveChatTitle(messages),
    messages,
    createdAt: now,
    updatedAt: now,
  };
}

function migrateLegacyStore(): ChatStore | null {
  const legacy = localStorage.getItem(LEGACY_KEY);
  if (!legacy) return null;

  try {
    const messages = JSON.parse(legacy) as ChatMessage[];
    localStorage.removeItem(LEGACY_KEY);

    if (!Array.isArray(messages) || messages.length === 0) {
      return null;
    }

    const chat = createChatSession(messages);
    return { activeChatId: chat.id, chats: [chat] };
  } catch {
    localStorage.removeItem(LEGACY_KEY);
    return null;
  }
}

export function loadChatStore(): ChatStore {
  const migrated = migrateLegacyStore();
  if (migrated) {
    saveChatStore(migrated);
    return migrated;
  }

  const stored = localStorage.getItem(STORE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as ChatStore;
      if (parsed.activeChatId && Array.isArray(parsed.chats) && parsed.chats.length > 0) {
        return parsed;
      }
    } catch {
      // fall through to default
    }
  }

  const chat = createChatSession();
  return { activeChatId: chat.id, chats: [chat] };
}

export function saveChatStore(store: ChatStore) {
  const storable: ChatStore = {
    activeChatId: store.activeChatId,
    chats: store.chats.map((chat) => ({
      ...chat,
      messages: chat.messages.map(({ isStreaming: _, ...message }) => message),
    })),
  };
  localStorage.setItem(STORE_KEY, JSON.stringify(storable));
}

export function formatChatDate(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}
