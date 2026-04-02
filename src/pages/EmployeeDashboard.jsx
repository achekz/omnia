import { useState } from "react";
import axios from "axios";

export default function EmployeeDashboard() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { text: input, type: "user" };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const res = await axios.post("/api/ai/ask", {
        message: input,
      });

      const aiMessage = { text: res.data.response, type: "ai" };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { text: "Erreur serveur", type: "ai" },
      ]);
    }

    setInput("");
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>👨‍💼 Employee Dashboard</h2>

      {/* CHAT BOX */}
      <div
        style={{
          border: "1px solid #ccc",
          borderRadius: "10px",
          padding: "10px",
          height: "300px",
          overflowY: "scroll",
          marginBottom: "10px",
          background: "#f9f9f9",
        }}
      >
        {messages.map((msg, index) => (
          <div
            key={index}
            style={{
              textAlign: msg.type === "user" ? "right" : "left",
              margin: "5px 0",
            }}
          >
            <span
              style={{
                display: "inline-block",
                padding: "8px",
                borderRadius: "10px",
                background:
                  msg.type === "user" ? "#4caf50" : "#e0e0e0",
                color: msg.type === "user" ? "#fff" : "#000",
              }}
            >
              {msg.text}
            </span>
          </div>
        ))}
      </div>

      {/* INPUT */}
      <div style={{ display: "flex", gap: "10px" }}>
        <input
          style={{ flex: 1, padding: "10px" }}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask OmniAI..."
        />

        <button onClick={sendMessage} style={{ padding: "10px 20px" }}>
          Send
        </button>
      </div>
    </div>
  );
}