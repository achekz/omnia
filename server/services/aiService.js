import axios from "axios";

const FLASK_AI_URL = process.env.FLASK_AI_URL || "http://localhost:5000";

const aiClient = axios.create({
  baseURL: FLASK_AI_URL,
  timeout: parseInt(process.env.FLASK_AI_TIMEOUT || "10000", 10),
  headers: {
    "Content-Type": "application/json",
  },
});

function fallbackPrediction(user, tasks = [], performanceLogs = []) {
  const completedTasks = tasks.filter((task) => task.status === "done").length;
  const delayedTasks = tasks.filter((task) => task.status === "overdue").length;
  const performanceScore =
    performanceLogs.length > 0
      ? Math.round(performanceLogs.reduce((sum, entry) => sum + (entry.score || 0), 0) / performanceLogs.length)
      : Math.max(40, 80 - delayedTasks * 10 + completedTasks * 4);

  return {
    userId: user._id?.toString?.() || String(user._id || user.id || ""),
    name: user.name,
    role: user.role,
    completedTasks,
    delayedTasks,
    performanceScore: Math.max(0, Math.min(100, performanceScore)),
    disciplineScore: Math.max(0, Math.min(100, 100 - delayedTasks * 15)),
    source: "local-fallback",
  };
}

function buildFallbackRecommendations(predictions = []) {
  const sortedByPerformance = [...predictions].sort((a, b) => (b.performanceScore || 0) - (a.performanceScore || 0));
  const sortedByDiscipline = [...predictions].sort((a, b) => (b.disciplineScore || 0) - (a.disciplineScore || 0));
  const delayedUsers = predictions
    .filter((entry) => (entry.delayedTasks || 0) > 0)
    .sort((a, b) => (b.delayedTasks || 0) - (a.delayedTasks || 0))
    .map((entry) => ({
      userId: entry.userId,
      name: entry.name,
      delayedTasks: entry.delayedTasks || 0,
    }));

  return {
    summary: "Recommendations generated from the last 6 days of task and performance data.",
    bestEmployee: sortedByPerformance[0] || null,
    mostDisciplined: sortedByDiscipline[0] || null,
    delayedUsers,
    recommendations: [
      delayedUsers.length > 0
        ? `Follow up with ${delayedUsers[0].name} to reduce delayed tasks and improve execution consistency.`
        : "No delayed users detected in the last 6 days. Keep the current delivery cadence.",
      sortedByPerformance[0]
        ? `Use ${sortedByPerformance[0].name} as a benchmark for high-output workflows this week.`
        : "Collect more activity data to unlock stronger recommendations.",
    ],
    source: "local-fallback",
  };
}

export async function predictPerformance(payload) {
  try {
    const { data } = await aiClient.post("/predict/performance", payload);
    return data;
  } catch (error) {
    console.warn("[AI] Flask /predict/performance unavailable, using local fallback:", error.message);
    const predictions = (payload.users || []).map((entry) => fallbackPrediction(entry.user, entry.tasks, entry.performanceLogs));
    return {
      predictions,
      source: "local-fallback",
    };
  }
}

export async function fetchRecommendations(payload) {
  try {
    const { data } = await aiClient.get("/recommendations", {
      params: {
        tenantId: payload.tenantId || "",
        windowDays: payload.windowDays || 6,
      },
    });
    return data;
  } catch (error) {
    console.warn("[AI] Flask /recommendations unavailable, using local fallback:", error.message);
    return buildFallbackRecommendations(payload.predictions || []);
  }
}

export default {
  predictPerformance,
  fetchRecommendations,
};
