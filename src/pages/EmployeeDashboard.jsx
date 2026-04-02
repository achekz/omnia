import { useState, useRef, useEffect } from "react";
import axios from "axios";
import AnalyticsChart from "../components/AnalyticsChart";

export default function EmployeeDashboard() {
  const [darkMode, setDarkMode] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);

  const chatRef = useRef(null);

  useEffect(() => {
    chatRef.current?.scrollTo(0, chatRef.current.scrollHeight);
  }, [messages]);

  // 🎤 VOICE
  const startVoice = () => {
    if (!("webkitSpeechRecognition" in window)) {
      alert("Voice not supported");
      return;
    }

    const recognition = new window.webkitSpeechRecognition();
    recognition.lang = "fr-FR";

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      setInput(text);
    };

    recognition.start();
  };

  // 🔊 SPEAK
  const speak = (text) => {
    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = "fr-FR";
    window.speechSynthesis.speak(speech);
  };

  // 🤖 CREATE TASK
  const createTask = async (title) => {
    try {
      await axios.post("/api/ai/create-task-from-ai", { title });
    } catch (err) {
      console.error("Task error");
    }
  };

  // 🤖 SEND MESSAGE
  const sendMessage = async () => {
    if (!input.trim()) return;

    setMessages((prev) => [...prev, { text: input, type: "user" }]);
    setIsTyping(true);

    try {
      const res = await axios.post("/api/ai/ask", {
        message: input,
      });

      const aiText = res.data.response;

      speak(aiText);

      // ✅ AI ACTION DETECTION (CORRECT PLACE)
      if (aiText.includes("Actions")) {
        createTask("Task suggested by AI");
      }

      if (aiText.includes("Terminer")) {
        createTask("Terminer tâche urgente");
      }

      setMessages((prev) => [
        ...prev,
        { text: aiText, type: "ai" },
      ]);

    } catch {
      setMessages((prev) => [
        ...prev,
        { text: "Erreur AI", type: "ai" },
      ]);
    }

    setIsTyping(false);
    setInput("");
  };

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        background: darkMode ? "#020617" : "#f1f5f9",
        color: darkMode ? "#fff" : "#000",
      }}
    >

      {/* SIDEBAR */}
      <div style={{
        width: "250px",
        background: "#0f172a",
        color: "#fff",
        padding: "20px"
      }}>
        <h2>OmniAI</h2>
        <p>Dashboard</p>
        <p>Tasks</p>
        <p>Analytics</p>

        <button onClick={() => setDarkMode(!darkMode)}>
          🌙 Toggle
        </button>
      </div>

      {/* MAIN */}
      <div style={{ flex: 1, padding: "20px" }}>
        <h2>👨‍💼 Employee Dashboard</h2>

        {/* CHAT */}
        <div style={{
          background: darkMode ? "#1e293b" : "#fff",
          borderRadius: "16px",
          padding: "15px"
        }}>
          <h3>🤖 AI Assistant</h3>

          <div ref={chatRef} style={{
            height: "300px",
            overflowY: "auto"
          }}>
            {messages.map((msg, i) => (
              <div key={i} style={{
                textAlign: msg.type === "user" ? "right" : "left"
              }}>
                <b>{msg.type === "ai" ? "🤖 AI" : "👤 You"}:</b>
                <br />
                <span>{msg.text}</span>
              </div>
            ))}

            {isTyping && <p>🤖 AI is typing...</p>}
          </div>

          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />

          <button onClick={sendMessage}>Send</button>
          <button onClick={startVoice}>🎤</button>
        </div>

        {/* INSIGHTS */}
        <div style={{
          marginTop: "20px",
          padding: "15px",
          background: darkMode ? "#1e293b" : "#fff"
        }}>
          <h3>📊 AI Insights</h3>
          <p>Productivity: 78%</p>
          <p>Risk Level: Medium</p>
        </div>
      </div>
    </div>
  );
}