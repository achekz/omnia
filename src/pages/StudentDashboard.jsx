import { useEffect, useState } from "react";

export default function StudentDashboard() {
  const [tasks, setTasks] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [risk, setRisk] = useState(null);

  // 🔹 Fetch tasks
  const fetchTasks = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/tasks", {
        headers: {
          Authorization: "Bearer " + localStorage.getItem("token"),
        },
      });
      const data = await res.json();
      setTasks(data.data.tasks || []);
    } catch (err) {
      console.error(err);
    }
  };

  // 🔹 Fetch ML data
  const fetchML = async () => {
    try {
      const recRes = await fetch("http://localhost:5000/api/ml/recommend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + localStorage.getItem("token"),
        },
        body: JSON.stringify({}),
      });

      const recData = await recRes.json();
      setRecommendations(recData.data || []);

      const riskRes = await fetch("http://localhost:5000/api/ml/predict-risk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + localStorage.getItem("token"),
        },
        body: JSON.stringify({}),
      });

      const riskData = await riskRes.json();
      setRisk(riskData.data?.risk || 0);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchML();
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h2>🎓 Student Dashboard</h2>

      {/* 📚 TASKS */}
      <div>
        <h3>📚 Study Tasks</h3>
        {tasks.length === 0 ? (
          <p>No tasks</p>
        ) : (
          tasks.map((task) => (
            <div key={task._id}>
              <b>{task.title}</b> - {task.status}
            </div>
          ))
        )}
      </div>

      {/* 📅 EXAMS */}
      <div style={{ marginTop: "20px" }}>
        <h3>📅 Exams</h3>
        <p>📌 Math Exam - 25 May</p>
        <p>📌 AI Exam - 30 May</p>
      </div>

      {/* 🧠 AI */}
      <div style={{ marginTop: "20px" }}>
        <h3>🧠 AI Study Assistant</h3>

        {/* Risk */}
        <p>
          Risk Level:{" "}
          <span style={{ color: risk > 0.7 ? "red" : "green" }}>
            {risk}
          </span>
        </p>

        {/* Recommendations */}
        <ul>
          {recommendations.map((rec, i) => (
            <li key={i}>{rec}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}