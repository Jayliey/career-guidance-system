import { useState } from "react";

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = { role: "user", text: input };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      });
      const data = await res.json();
      const botMsg = { role: "bot", text: data.reply || "Sorry, I couldn't process that." };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [...prev, { role: "bot", text: "Error connecting to AI service." }]);
    } finally {
      setLoading(false);
      setInput("");
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="chatbot-toggle-btn"
        aria-label="Open chat"
      >
        💬
      </button>
    );
  }

  return (
    <div className="chatbot-container">
      <div className="chatbot-header">
        <span>🤖 Career Assistant</span>
        <button onClick={() => setIsOpen(false)}>✕</button>
      </div>
      <div className="chatbot-messages">
        {messages.length === 0 && (
          <div className="chatbot-empty">Ask me about careers, skills, or jobs!</div>
        )}
        {messages.map((msg, idx) => (
          <div key={idx} className={`chatbot-msg ${msg.role}`}>
            {msg.text}
          </div>
        ))}
        {loading && <div className="chatbot-msg bot typing">Typing...</div>}
      </div>
      <div className="chatbot-input-area">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Ask a question..."
        />
        <button onClick={sendMessage} disabled={loading}>
          Send
        </button>
      </div>
    </div>
  );
}