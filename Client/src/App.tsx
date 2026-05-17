import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import "./App.css";
import {
  createChatSession,
  deriveChatTitle,
  formatChatDate,
  loadChatStore,
  saveChatStore,
} from "./chatStorage";
import { copyText } from "./clipboard";
import { markdownComponents } from "./markdownComponents";
import { readSseStream } from "./sse";
import type { ChatMessage, ChatSession, ChatStore } from "./types";

const API_URL = "http://localhost:5000/api/chat";

const SUGGESTIONS = [
  "Explain async/await in JavaScript",
  "Help me draft a professional email",
  "What are REST API best practices?",
];

type Theme = "light" | "dark";

function getInitialTheme(): Theme {
  const saved = localStorage.getItem("theme");
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function SparkleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z"
        fill="currentColor"
      />
      <path
        d="M19 14L19.75 16.25L22 17L19.75 17.75L19 20L18.25 17.75L16 17L18.25 16.25L19 14Z"
        fill="currentColor"
        opacity="0.7"
      />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M21 14.5A8.5 8.5 0 1 1 9.5 3a6.5 6.5 0 1 0 11.5 11.5z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 12h14M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M10 11v6M14 11v6M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7h16M4 12h16M4 17h16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function sortChatsByUpdated(chats: ChatSession[]) {
  return [...chats].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="9"
        y="9"
        width="13"
        height="13"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 12l4 4L19 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CopyMessageButton({
  content,
  messageId,
  copiedId,
  onCopied,
}: {
  content: string;
  messageId: string;
  copiedId: string | null;
  onCopied: (id: string) => void;
}) {
  const copied = copiedId === messageId;

  const handleCopy = async () => {
    try {
      await copyText(content);
      onCopied(messageId);
    } catch {
      // Clipboard access denied or unavailable
    }
  };

  return (
    <button
      type="button"
      className={`copy-btn${copied ? " copied" : ""}`}
      onClick={handleCopy}
      aria-label={copied ? "Copied to clipboard" : "Copy message"}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
      <span>{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}

function TypingIndicator() {
  return (
    <div className="typing-indicator" aria-label="Assistant is typing">
      <span />
      <span />
      <span />
    </div>
  );
}

function AssistantContent({ message }: { message: ChatMessage }) {
  if (message.isStreaming && !message.content) {
    return <TypingIndicator />;
  }

  if (message.isStreaming) {
    return <p className="streaming-text">{message.content}</p>;
  }

  return (
    <ReactMarkdown components={markdownComponents}>
      {message.content}
    </ReactMarkdown>
  );
}

function App() {
  const [store, setStore] = useState<ChatStore>(loadChatStore);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { activeChatId, chats } = store;
  const activeChat =
    chats.find((chat) => chat.id === activeChatId) ?? chats[0] ?? null;
  const messages = activeChat?.messages ?? [];

  const updateActiveChat = (
    updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[]),
    options?: { title?: string }
  ) => {
    setStore((prev) => {
      const current = prev.chats.find((chat) => chat.id === prev.activeChatId);
      if (!current) return prev;

      const nextMessages =
        typeof updater === "function" ? updater(current.messages) : updater;

      const nextTitle =
        options?.title ??
        (current.title === "New chat"
          ? deriveChatTitle(nextMessages)
          : current.title);

      const updatedChat: ChatSession = {
        ...current,
        title: nextTitle,
        messages: nextMessages,
        updatedAt: new Date().toISOString(),
      };

      const nextChats = prev.chats.map((chat) =>
        chat.id === prev.activeChatId ? updatedChat : chat
      );

      return {
        ...prev,
        chats: sortChatsByUpdated(nextChats),
      };
    });
  };

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    saveChatStore(store);
  }, [store]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, activeChatId]);

  useEffect(() => {
    if (!copiedId) return;
    const timeoutId = window.setTimeout(() => setCopiedId(null), 2000);
    return () => window.clearTimeout(timeoutId);
  }, [copiedId]);

  const sendMessage = async (prompt: string) => {
    const trimmed = prompt.trim();
    if (!trimmed || loading) return;

    setError("");

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };

    const assistantId = crypto.randomUUID();
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
      isStreaming: true,
    };

    updateActiveChat((prev) => [...prev, userMessage, assistantMessage]);
    setInput("");
    setLoading(true);

    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 30000);

      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
        signal: controller.signal,
      });

      window.clearTimeout(timeoutId);

      if (!response.ok) {
        const contentType = response.headers.get("content-type") ?? "";
        let errorMessage = "Failed to fetch response.";

        if (contentType.includes("application/json")) {
          const data = await response.json();
          errorMessage = data.error || errorMessage;
        }

        throw new Error(errorMessage);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Streaming is not supported in this browser.");
      }

      let fullText = "";
      let streamError: Error | null = null;

      await readSseStream(reader, (event) => {
        if (event.type === "token") {
          fullText += event.content;
          updateActiveChat((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: fullText } : m
            )
          );
        } else if (event.type === "error") {
          streamError = new Error(event.message);
        }
      });

      if (streamError) throw streamError;

      const finalContent = fullText.trim() || "No response generated.";

      updateActiveChat((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: finalContent, isStreaming: false }
            : m
        )
      );
    } catch (err) {
      updateActiveChat((prev) => {
        const assistant = prev.find((m) => m.id === assistantId);
        if (!assistant?.content) {
          return prev.filter((m) => m.id !== assistantId);
        }
        return prev.map((m) =>
          m.id === assistantId ? { ...m, isStreaming: false } : m
        );
      });

      if (err instanceof Error && err.name === "AbortError") {
        setError("Request timed out. Please try again.");
      } else if (err instanceof Error) {
        setError(err.message || "Unable to get AI response. Please try again.");
      } else {
        setError("Unable to get AI response. Please try again.");
      }
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!input.trim()) {
      setError("Please enter a message.");
      return;
    }
    sendMessage(input);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!input.trim()) return;
      sendMessage(input);
    }
  };

  const newChat = () => {
    if (loading) return;
    setError("");
    setInput("");
    const chat = createChatSession();
    setStore((prev) => ({
      activeChatId: chat.id,
      chats: sortChatsByUpdated([chat, ...prev.chats]),
    }));
    setSidebarOpen(false);
    textareaRef.current?.focus();
  };

  const selectChat = (chatId: string) => {
    if (loading || chatId === activeChatId) return;
    setError("");
    setStore((prev) => ({ ...prev, activeChatId: chatId }));
    setSidebarOpen(false);
  };

  const deleteChat = (chatId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (loading) return;

    setStore((prev) => {
      const remaining = prev.chats.filter((chat) => chat.id !== chatId);

      if (remaining.length === 0) {
        const chat = createChatSession();
        return { activeChatId: chat.id, chats: [chat] };
      }

      const nextActiveId =
        prev.activeChatId === chatId ? remaining[0].id : prev.activeChatId;

      return {
        activeChatId: nextActiveId,
        chats: sortChatsByUpdated(remaining),
      };
    });
    setError("");
  };

  const clearChat = () => {
    if (loading || messages.length === 0) return;
    setError("");
    updateActiveChat([], { title: "New chat" });
    setInput("");
    textareaRef.current?.focus();
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const isStreaming = messages.some((m) => m.isStreaming);

  return (
    <main className="app">
      <div className="app-layout">
        {sidebarOpen && (
          <button
            type="button"
            className="sidebar-backdrop"
            aria-label="Close chat history"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <aside
          className={`sidebar${sidebarOpen ? " open" : ""}`}
          aria-label="Chat history"
        >
          <div className="sidebar-header">
            <h2>Chats</h2>
            <button
              type="button"
              className="new-chat-btn"
              onClick={newChat}
              disabled={loading}
            >
              <PlusIcon />
              <span>New chat</span>
            </button>
          </div>

          <ul className="chat-list" role="list">
            {chats.map((chat) => (
              <li key={chat.id}>
                <button
                  type="button"
                  className={`chat-list-item${chat.id === activeChatId ? " active" : ""}`}
                  onClick={() => selectChat(chat.id)}
                  disabled={loading}
                >
                  <span className="chat-list-title">{chat.title}</span>
                  <span className="chat-list-meta">
                    {formatChatDate(chat.updatedAt)}
                    {chat.messages.length > 0 &&
                      ` · ${Math.ceil(chat.messages.length / 2)} msgs`}
                  </span>
                </button>
                <button
                  type="button"
                  className="chat-delete-btn"
                  onClick={(event) => deleteChat(chat.id, event)}
                  disabled={loading}
                  aria-label={`Delete ${chat.title}`}
                >
                  <TrashIcon />
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className="chat-shell" aria-label="Chat interface">
        <header className="chat-header">
          <div className="header-brand">
            <button
              type="button"
              className="icon-btn sidebar-toggle"
              onClick={() => setSidebarOpen((open) => !open)}
              aria-label="Toggle chat history"
            >
              <MenuIcon />
            </button>
            <div className="brand-icon" aria-hidden>
              <SparkleIcon />
            </div>
            <div className="brand-text">
              <h1>{activeChat?.title ?? "AI Assistant"}</h1>
              <p>Powered by Groq · Llama 3.1</p>
            </div>
          </div>

          <div className="header-actions">
            <button
              type="button"
              className="new-chat-btn new-chat-btn--compact"
              onClick={newChat}
              disabled={loading}
            >
              <PlusIcon />
              <span>New chat</span>
            </button>
            <button
              type="button"
              className="clear-btn"
              onClick={clearChat}
              disabled={messages.length === 0 || loading}
            >
              <TrashIcon />
              <span>Clear chat</span>
            </button>
            <button
              type="button"
              className="icon-btn"
              onClick={toggleTheme}
              aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            >
              {theme === "light" ? <MoonIcon /> : <SunIcon />}
            </button>
          </div>
        </header>

        <section className="messages" aria-live="polite" aria-relevant="additions">
          {messages.length === 0 && !loading && (
            <div className="empty-state">
              <div className="empty-icon" aria-hidden>
                <SparkleIcon />
              </div>
              <h2>How can I help you today?</h2>
              <p>Ask a question or pick a suggestion to start the conversation.</p>
              <div className="suggestions">
                {SUGGESTIONS.map((text) => (
                  <button
                    key={text}
                    type="button"
                    className="suggestion-chip"
                    onClick={() => sendMessage(text)}
                    disabled={loading}
                  >
                    {text}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <article
              key={message.id}
              className={`message-row ${message.role}`}
              aria-busy={message.isStreaming || undefined}
            >
              <div className="message-avatar" aria-hidden>
                {message.role === "user" ? "You" : "AI"}
              </div>
              <div className="message-body">
                <div
                  className={`message-meta${message.role === "assistant" ? " message-meta--assistant" : ""}`}
                >
                  <div className="message-meta-start">
                    <strong>{message.role === "user" ? "You" : "Assistant"}</strong>
                    <time className="message-time" dateTime={message.createdAt}>
                      {formatTime(message.createdAt)}
                    </time>
                  </div>
                  {message.role === "assistant" &&
                    message.content &&
                    !message.isStreaming && (
                      <CopyMessageButton
                        content={message.content}
                        messageId={message.id}
                        copiedId={copiedId}
                        onCopied={setCopiedId}
                      />
                    )}
                </div>
                <div className="message-bubble">
                  {message.role === "user" ? (
                    <p>{message.content}</p>
                  ) : (
                    <AssistantContent message={message} />
                  )}
                </div>
              </div>
            </article>
          ))}

          <div ref={messagesEndRef} />
        </section>

        {error && (
          <p className="error-banner" role="alert">
            {error}
          </p>
        )}

        <form className="composer" onSubmit={handleSubmit}>
          <label htmlFor="prompt" className="sr-only">
            Message
          </label>
          <div className="composer-inner">
            <textarea
              ref={textareaRef}
              id="prompt"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                if (error) setError("");
              }}
              onKeyDown={handleKeyDown}
              placeholder="Message AI Assistant…"
              rows={1}
              disabled={loading}
            />
            <button
              type="submit"
              className="send-btn"
              disabled={loading || !input.trim()}
              aria-label="Send message"
            >
              <SendIcon />
            </button>
          </div>
          <p className="composer-hint">
            Press <kbd>Enter</kbd> to send · <kbd>Shift</kbd>+<kbd>Enter</kbd> for a new line
            {isStreaming && " · Response streaming"}
          </p>
        </form>
        </section>
      </div>
    </main>
  );
}

export default App;
