import { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isToolUIPart, getToolName } from "ai";

const transport = new DefaultChatTransport({
  api: "http://localhost:3001/api/chat",
});

export function App() {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, status, sendMessage } = useChat({
    transport,
  });

  const isLoading = status === "streaming" || status === "submitted";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput("");
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>AI Agent Chat</h1>
      </header>

      <div style={styles.messages}>
        {messages.length === 0 && (
          <p style={styles.empty}>
            Ask me anything! I can check weather and do calculations.
          </p>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            style={{
              ...styles.message,
              ...(message.role === "user" ? styles.userMsg : styles.assistantMsg),
            }}
          >
            <div style={styles.role}>
              {message.role === "user" ? "You" : "Assistant"}
            </div>
            <div>
              {message.parts.map((part, i) => {
                if (part.type === "text") {
                  return <span key={i}>{part.text}</span>;
                }
                if (isToolUIPart(part)) {
                  const name = getToolName(part);
                  return (
                    <div key={i} style={styles.toolCall}>
                      <div style={styles.toolName}>Tool: {name}</div>
                      {part.input != null && (
                        <pre style={styles.toolArgs}>
                          {JSON.stringify(part.input, null, 2)}
                        </pre>
                      )}
                      {part.state === "output-available" && (
                        <pre style={styles.toolResult}>
                          {JSON.stringify(part.output, null, 2)}
                        </pre>
                      )}
                    </div>
                  );
                }
                return null;
              })}
            </div>
          </div>
        ))}
        {isLoading && (
          <div style={styles.loading}>Thinking...</div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          style={styles.input}
          disabled={isLoading}
        />
        <button type="submit" style={styles.sendBtn} disabled={isLoading}>
          Send
        </button>
      </form>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 700,
    margin: "0 auto",
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    fontFamily: "system-ui, -apple-system, sans-serif",
    background: "#0a0a0a",
    color: "#e5e5e5",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 20px",
    borderBottom: "1px solid #262626",
  },
  title: { margin: 0, fontSize: 20, fontWeight: 600 },
  clearBtn: {
    background: "transparent",
    color: "#a3a3a3",
    border: "1px solid #333",
    padding: "6px 14px",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 13,
  },
  messages: {
    flex: 1,
    overflow: "auto",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  empty: { color: "#737373", textAlign: "center", marginTop: 40 },
  message: { padding: "12px 16px", borderRadius: 10, maxWidth: "85%" },
  userMsg: {
    background: "#1a1a2e",
    alignSelf: "flex-end",
    borderBottomRightRadius: 2,
  },
  assistantMsg: {
    background: "#1c1c1c",
    alignSelf: "flex-start",
    borderBottomLeftRadius: 2,
  },
  role: {
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase" as const,
    color: "#737373",
    marginBottom: 4,
  },
  toolCall: {
    background: "#111",
    border: "1px solid #333",
    borderRadius: 6,
    padding: 10,
    margin: "8px 0",
    fontSize: 13,
  },
  toolName: { fontWeight: 600, color: "#60a5fa", marginBottom: 4 },
  toolArgs: {
    margin: 0,
    color: "#a3a3a3",
    fontSize: 12,
    fontFamily: "monospace",
  },
  toolResult: {
    margin: "8px 0 0",
    color: "#4ade80",
    fontSize: 12,
    fontFamily: "monospace",
    borderTop: "1px solid #333",
    paddingTop: 8,
  },
  loading: { color: "#737373", fontStyle: "italic" },
  form: {
    display: "flex",
    gap: 8,
    padding: "16px 20px",
    borderTop: "1px solid #262626",
  },
  input: {
    flex: 1,
    padding: "10px 14px",
    borderRadius: 8,
    border: "1px solid #333",
    background: "#141414",
    color: "#e5e5e5",
    fontSize: 14,
    outline: "none",
  },
  sendBtn: {
    padding: "10px 20px",
    borderRadius: 8,
    border: "none",
    background: "#3b82f6",
    color: "white",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: 14,
  },
};
