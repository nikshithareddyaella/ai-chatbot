import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import "./App.css";
import type { ChatMessage } from "./types";

const API_URL = "http://localhost:5000/api/chat";

function App() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem("chatHistory");
    return saved ? JSON.parse(saved) : [];
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    localStorage.setItem("chatHistory", JSON.stringify(messages));
  }, [messages]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const prompt = input.trim();

    if (!prompt) {
      setError("Please enter a prompt.");
      return;
    }

    setError("");

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: prompt,
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: prompt }),
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
    }
  };

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem("chatHistory");
    setError("");
  };

  return (
    <main className="app">
      <section className="chat-container">
        <header className="chat-header">
          <div>
            <h1>AI Chatbot</h1>
            <p>Ask anything and get an AI-powered response.</p>
          </div>

          <button className="clear-btn" onClick={clearChat}>
            Clear Chat
          </button>
        </header>

        <section className="messages" aria-live="polite">
          {messages.length === 0 && (
            <div className="empty-state">
              <h2>Start a conversation</h2>
              <p>Type your question below and press submit.</p>
            </div>
          )}

          {messages.map((message) => (
            <article
              key={message.id}
              className={`message ${message.role === "user" ? "user" : "assistant"}`}
            >
              <strong>{message.role === "user" ? "You" : "AI"}</strong>
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </article>
          ))}

          {loading && (
            <div className="message assistant loading">
              <strong>AI</strong>
              <p>Thinking...</p>
            </div>
          )}
        </section>

        {error && <p className="error">{error}</p>}

        <form className="chat-form" onSubmit={handleSubmit}>
          <label htmlFor="prompt" className="sr-only">
            Enter your prompt
          </label>

          <textarea
            id="prompt"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything..."
            rows={3}
          />

          <button type="submit" disabled={loading}>
            {loading ? "Generating..." : "Submit"}
          </button>
        </form>
      </section>
    </main>
  );
}

export default App;