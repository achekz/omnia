import { useState, useRef, useEffect } from "react";
import axios from "axios";
import AnalyticsChart from "../components/AnalyticsChart";
import TaskBoard from "../components/TaskBoard";

// ✅ API CONFIG
const API = axios.create({
  baseURL: "http://localhost:5000",
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default function EmployeeDashboard() {
  const [prediction, setPrediction] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);

  const chatRef = useRef(null);

  // 🔽 FETCH TASKS
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const res = await API.get("/api/tasks");
        setTasks(res.data);
      } catch (err) {
        console.error("Tasks error", err);
      }
    };
    fetchTasks();
  }, []);

  // 🔽 FETCH ANALYTICS
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await API.get("/api/analytics/activity");
        setChartData(res.data);
      } catch (err) {
        console.error("Analytics error", err);
      }
    };
    fetchData();
  }, []);

  // 🔽 AUTO SCROLL
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
      setInput(event.results[0][0].transcript);
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
      await API.post("/api/ai/create-task-from-ai", { title });
    } catch (err) {
      console.error("Create task error", err);
    }
  };

  // 🤖 SEND MESSAGE
  const sendMessage = async () => {
    if (!input.trim()) return;

    setMessages((prev) => [...prev, { text: input, type: "user" }]);
    setIsTyping(true);

    try {
      const res = await API.post("/api/ai/chat", {
        message: input,
      });

      const aiText = res.data.reply;

      speak(aiText);

      if (aiText.includes("Actions")) {
        createTask("Task suggested by AI");
      }

      setMessages((prev) => [
        ...prev,
        { text: aiText, type: "ai" },
      ]);

      setPrediction(res.data.prediction || null);

    } catch (err) {
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
      <div
        style={{
          width: "250px",
          background: "#0f172a",
          color: "#fff",
          padding: "20px",
        }}
      >
        <h2>Omni AI</h2>
        <button onClick={() => setDarkMode(!darkMode)}>🌙</button>
      </div>

      {/* MAIN */}
      <div style={{ flex: 1, padding: "20px" }}>
        <h2>Dashboard</h2>

        {/* AI CHAT */}
        <div
          style={{
            background: darkMode ? "#1e293b" : "#fff",
            padding: "15px",
            borderRadius: "10px",
          }}
        >
          <h3>🤖 AI Assistant</h3>

          <div ref={chatRef} style={{ height: "200px", overflowY: "auto" }}>
            {messages.map((msg, i) => (
              <div key={i}>
                <b>{msg.type === "ai" ? "🤖 AI" : "👤 You"}:</b>
                <p>{msg.text}</p>
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

        {/* AI PREDICTION */}
        <div style={{ marginTop: "20px" }}>
          <h3>🔮 AI Prediction</h3>
          <p>{prediction || "No prediction yet"}</p>
        </div>

        {/* CHART */}
        <AnalyticsChart data={chartData} />

        {/* TASKS */}
        <TaskBoard tasks={tasks} setTasks={setTasks} />
      </div>
    </div>
  );
}
