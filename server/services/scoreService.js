import ActivityLog from '../models/ActivityLog.js';

export const calculateScore = async (userId) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let log = await ActivityLog.findOne({ userId, date: today });
  if (!log) {
    log = await ActivityLog.create({ userId, date: today });
  }

  // Score formula: max 100 pts
  // tasks_completed * 10 (max 40)
  const taskPoints = Math.min(log.tasksCompleted * 10, 40);
  // active_minutes / 10 (max 30)
  const minutePoints = Math.min(Math.floor(log.activeMinutes / 10), 30);
  // overdue penalty
  const overduePoints = log.overdueCount === 0 ? 20 : log.overdueCount === 1 ? 10 : 0;
  // login bonus
  const loginPoints = log.loginCount > 0 ? 10 : 0;

  const score = taskPoints + minutePoints + overduePoints + loginPoints;
  log.score = score;
  await log.save();

  return score;
};
