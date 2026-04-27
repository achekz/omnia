import User from "../models/User.js";
import Task from "../models/Task.js";
import PerformanceLog from "../models/PerformanceLog.js";
import Recommendation from "../models/Recommendation.js";
import { fetchRecommendations, predictPerformance } from "./aiService.js";
import { normalizeRole } from "../utils/roleNormalization.js";

const WINDOW_DAYS = 6;

function getWindowStart() {
  return new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
}

function buildScopeFilter({ tenantId, userIds }) {
  const filter = {};

  if (tenantId) {
    filter.tenantId = tenantId;
  }

  if (userIds?.length) {
    filter._id = { $in: userIds };
  }

  return filter;
}

export async function refreshRecommendationsForScope({ tenantId, userIds, trigger = "manual" } = {}) {
  const windowStart = getWindowStart();
  const windowEnd = new Date();
  const userFilter = buildScopeFilter({ tenantId, userIds });

  const users = await User.find(userFilter)
    .select("_id name email role profileType tenantId")
    .sort({ createdAt: -1 });

  const relevantUsers = users.filter((user) => normalizeRole(user.role, "employee") !== "admin");

  if (!relevantUsers.length) {
    return null;
  }

  const userIdsList = relevantUsers.map((user) => user._id);
  const taskFilter = {
    assignedTo: { $in: userIdsList },
    createdAt: { $gte: windowStart, $lte: windowEnd },
  };

  if (tenantId) {
    taskFilter.tenantId = tenantId;
  }

  const performanceFilter = {
    userId: { $in: userIdsList },
    date: { $gte: windowStart, $lte: windowEnd },
  };

  if (tenantId) {
    performanceFilter.tenantId = tenantId;
  }

  const [tasks, performanceLogs] = await Promise.all([
    Task.find(taskFilter).sort({ createdAt: -1 }),
    PerformanceLog.find(performanceFilter).sort({ date: -1 }),
  ]);

  const usersPayload = relevantUsers.map((user) => ({
    user,
    tasks: tasks.filter((task) => String(task.assignedTo) === String(user._id)),
    performanceLogs: performanceLogs.filter((entry) => String(entry.userId) === String(user._id)),
  }));

  const predictionResult = await predictPerformance({
    tenantId,
    windowDays: WINDOW_DAYS,
    users: usersPayload,
  });

  const predictions = predictionResult.predictions || [];
  const recommendationResult = await fetchRecommendations({
    tenantId,
    windowDays: WINDOW_DAYS,
    predictions,
  });

  const recommendation = await Recommendation.create({
    tenantId: tenantId || null,
    windowStart,
    windowEnd,
    generatedBy: trigger,
    summary: recommendationResult.summary || "AI recommendations generated.",
    recommendations: recommendationResult.recommendations || [],
    ranking: recommendationResult.bestEmployee?.ranking || null,
    score: recommendationResult.bestEmployee?.performanceScore || null,
    meta: {
      source: recommendationResult.source || predictionResult.source || "flask",
      bestEmployee: recommendationResult.bestEmployee || null,
      mostDisciplined: recommendationResult.mostDisciplined || null,
      delayedUsers: recommendationResult.delayedUsers || [],
      predictions,
      windowDays: WINDOW_DAYS,
    },
  });

  return recommendation;
}
