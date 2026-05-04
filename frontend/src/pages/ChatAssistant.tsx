import { useState, useRef, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

interface Message {
  role: "user" | "bot";
  text: string;
}

function ChatAssistant() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg: Message = { role: "user", text: input };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      });
      const data = await res.json();
      const botMsg: Message = { role: "bot", text: data.reply || "Sorry, I couldn't process that." };
      setMessages((prev) => [...prev, botMsg]);
    } catch (error) {
      console.error(error);
      setMessages((prev) => [...prev, { role: "bot", text: "Error connecting to AI service." }]);
    } finally {
      setLoading(false);
      setInput("");
    }
  };

  return (
    <div className="chat-assistant-page">
      <div className="chat-header">
        <h1>Career Assistant (AI)</h1>
        <p>Ask me anything about careers, skills, job search, or learning paths.</p>
      </div>

      <div className="chat-messages-container">
        {messages.length === 0 && (
          <div className="chat-welcome">
            <p>👋 Welcome! I'm your AI career assistant. How can I help you today?</p>
            <p>Example questions:</p>
            <ul>
              <li>What does a Data Analyst do?</li>
              <li>How do I become a Software Engineer?</li>
              <li>What skills are needed for Cybersecurity?</li>
            </ul>
          </div>
        )}
        {messages.map((msg, idx) => (
          <div key={idx} className={`chat-message ${msg.role}`}>
            <div className="message-bubble">{msg.text}</div>
          </div>
        ))}
        {loading && (
          <div className="chat-message bot">
            <div className="message-bubble typing">Typing...</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Ask a career question..."
        />
        <button onClick={sendMessage} disabled={loading}>
          Send
        </button>
      </div>
    </div>
  );
}

export default ChatAssistant;