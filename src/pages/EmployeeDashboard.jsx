import { useState, useRef, useEffect } from "react";
import axios from "axios";
import AnalyticsChart from "../components/AnalyticsChart";
import TaskBoard from "../components/TaskBoard";
import { useAuth } from "@/hooks/useAuth";

const API = axios.create({
  baseURL: "http://localhost:5000",
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("omni_ai_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default function EmployeeDashboard() {
  const { clearAllUsers } = useAuth(); // ✅ هنا

  const [prediction, setPrediction] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);

  const chatRef = useRef(null);

  useEffect(() => {
    const fetchTasks = async () => {
      const res = await API.get("/api/tasks");
      setTasks(res.data);
    };
    fetchTasks();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const res = await API.get("/api/analytics/activity");
      setChartData(res.data);
    };
    fetchData();
  }, []);

  const sendMessage = async () => {
    if (!input.trim()) return;

    setMessages((prev) => [...prev, { text: input, type: "user" }]);
    setIsTyping(true);

    try {
      const res = await API.post("/api/ai/chat", { message: input });
      const aiText = res.data.reply;

      setMessages((prev) => [...prev, { text: aiText, type: "ai" }]);
      setPrediction(res.data.prediction || null);
    } catch {
      setMessages((prev) => [...prev, { text: "Erreur AI", type: "ai" }]);
    }

    setIsTyping(false);
    setInput("");
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Employee Dashboard</h2>

      {/* ✅ BUTTON */}
      <button onClick={clearAllUsers}>
        🧹 Supprimer les comptes
      </button>

      <AnalyticsChart data={chartData} />
      <TaskBoard tasks={tasks} setTasks={setTasks} />
    </div>
  );
}