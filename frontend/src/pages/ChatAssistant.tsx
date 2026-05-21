import { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

interface Message {
  role: "user" | "bot";
  text: string;
}

interface ChatAssistantProps {
  careerName?: string; // Optional: current career page context
}

function ChatAssistant({ careerName }: ChatAssistantProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const apiUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg: Message = { role: "user", text: input };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    // Build payload with user context
    const payload: any = { message: input };
    if (user?.id) payload.userId = user.id;
    if (careerName) payload.careerName = careerName;

    try {
      const res = await fetch(`${apiUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to get response from chat service.");
      }
      const botMsg: Message = { role: "bot", text: data.reply || "Sorry, I couldn't process that." };
      setMessages((prev) => [...prev, botMsg]);
    } catch (error: any) {
      console.error(error);
      setMessages((prev) => [...prev, { role: "bot", text: error.message || "Error connecting to AI service." }]);
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
        {user && <p className="text-sm text-gray-600">✓ Personalized to your skills and interests</p>}
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
            {user && (
              <p className="text-sm text-blue-600 mt-2">
                💡 I know your skills and can suggest what to learn next for your target career.
              </p>
            )}
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