import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import "./App.css";
import type { ChatMessage } from "./types";

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

function App() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem("chatHistory");
    return saved ? JSON.parse(saved) : [];
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("chatHistory", JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

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

    setMessages((prev) => [...prev, userMessage]);
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
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch response.");
      }

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.reply,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setError("Request timed out. Please try again.");
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

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem("chatHistory");
    setError("");
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  return (
    <main className="app">
      <section className="chat-shell" aria-label="Chat interface">
        <header className="chat-header">
          <div className="header-brand">
            <div className="brand-icon" aria-hidden>
              <SparkleIcon />
            </div>
            <div className="brand-text">
              <h1>AI Assistant</h1>
              <p>Powered by Groq · Llama 3.1</p>
            </div>
          </div>

          <div className="header-actions">
            <button
              type="button"
              className="icon-btn"
              onClick={toggleTheme}
              aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            >
              {theme === "light" ? <MoonIcon /> : <SunIcon />}
            </button>
            <button
              type="button"
              className="clear-btn"
              onClick={clearChat}
              disabled={messages.length === 0 && !loading}
            >
              <TrashIcon />
              <span>Clear chat</span>
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
            >
              <div className="message-avatar" aria-hidden>
                {message.role === "user" ? "You" : "AI"}
              </div>
              <div className="message-body">
                <div className="message-meta">
                  <strong>{message.role === "user" ? "You" : "Assistant"}</strong>
                  <time className="message-time" dateTime={message.createdAt}>
                    {formatTime(message.createdAt)}
                  </time>
                </div>
                <div className="message-bubble">
                  {message.role === "user" ? (
                    <p>{message.content}</p>
                  ) : (
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  )}
                </div>
              </div>
            </article>
          ))}

          {loading && (
            <article className="message-row assistant" aria-busy="true">
              <div className="message-avatar" aria-hidden>
                AI
              </div>
              <div className="message-body">
                <div className="message-meta">
                  <strong>Assistant</strong>
                </div>
                <div className="message-bubble">
                  <div className="typing-indicator" aria-label="Assistant is typing">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </div>
            </article>
          )}

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
          </p>
        </form>
      </section>
    </main>
  );
}

export default App;
