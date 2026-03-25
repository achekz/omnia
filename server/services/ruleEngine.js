import User from '../models/User.js';
import Task from '../models/Task.js';
import ActivityLog from '../models/ActivityLog.js';
import * as notifService from './notifService.js';

class RuleEngine {
  constructor() {
    this.rules = [
      // ── EMPLOYEE RULES ──
      {
        id: 'EMP_001',
        profile: 'employee',
        name: 'Overdue Tasks Alert',
        condition: async (user) => {
          const count = await Task.countDocuments({
            assignedTo: user._id,
            status: { $in: ['todo', 'in_progress'] },
            dueDate: { $lt: new Date() },
          });
          return count >= 3;
        },
        action: async (user) => {
          await notifService.create(user._id, user.tenantId, {
            type: 'warning',
            title: '⚠️ Overdue Tasks',
            message: 'You have 3+ overdue tasks. Review your priorities.',
            source: 'rule_engine',
            actionUrl: '/tasks',
          });
        },
      },
      {
        id: 'EMP_002',
        profile: 'employee',
        name: 'Productivity Drop Alert',
        condition: async (user) => {
          const logs = await ActivityLog.find({ userId: user._id })
            .sort({ date: -1 })
            .limit(7);
          if (logs.length < 4) return false;
          const recent = logs.slice(0, 3).reduce((a, l) => a + l.score, 0) / 3;
          const previous = logs.slice(3, 7).reduce((a, l) => a + l.score, 0) / 4;
          return previous > 0 && (previous - recent) / previous > 0.3;
        },
        action: async (user) => {
          await notifService.create(user._id, user.tenantId, {
            type: 'warning',
            title: '📉 Productivity Drop Detected',
            message: 'Your performance score dropped >30% this week. Need help?',
            source: 'rule_engine',
          });
        },
      },
      // ── STUDENT RULES ──
      {
        id: 'STU_001',
        profile: 'student',
        name: 'Exam Approaching Alert',
        condition: async (user) => {
          const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
          const upcomingExam = await Task.findOne({
            assignedTo: user._id,
            tags: { $in: ['exam', 'examen', 'test'] },
            status: { $ne: 'done' },
            dueDate: { $lte: threeDaysFromNow, $gte: new Date() },
          });
          return !!upcomingExam;
        },
        action: async (user) => {
          await notifService.create(user._id, user.tenantId, {
            type: 'danger',
            title: '🎓 Exam in 3 Days!',
            message: 'You have an exam coming up. Check your study plan now.',
            source: 'rule_engine',
            actionUrl: '/study',
          });
        },
      },
      {
        id: 'STU_002',
        profile: 'student',
        name: 'Budget Warning',
        condition: async (user) => {
          const today = new Date();
          const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
          const log = await ActivityLog.findOne({
            userId: user._id,
            date: { $gte: startOfMonth },
          });
          return log && log.budgetSpent > 400;
        },
        action: async (user) => {
          await notifService.create(user._id, user.tenantId, {
            type: 'warning',
            title: '💸 Budget Alert',
            message: 'You have spent a lot this month. Review your expenses.',
            source: 'rule_engine',
            actionUrl: '/budget',
          });
        },
      },
      // ── COMPANY RULES ──
      {
        id: 'COM_001',
        profile: 'company',
        name: 'Team Low Performance',
        condition: async (user) => {
          const members = await User.find({ tenantId: user.tenantId, role: 'employee' });
          if (!members.length) return false;
          const logs = await ActivityLog.find({
            userId: { $in: members.map((m) => m._id) },
            date: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          });
          if (!logs.length) return false;
          const avg = logs.reduce((a, l) => a + l.score, 0) / logs.length;
          return avg < 40;
        },
        action: async (user) => {
          await notifService.create(user._id, user.tenantId, {
            type: 'danger',
            title: '🏢 Team Performance Alert',
            message: 'Average team productivity is below 40% this week.',
            source: 'rule_engine',
            actionUrl: '/team',
          });
        },
      },
      // ── CABINET RULES ──
      {
        id: 'CAB_001',
        profile: 'cabinet',
        name: 'Tax Deadline Approaching',
        condition: async (user) => {
          const sevenDays = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
          const urgent = await Task.findOne({
            tenantId: user.tenantId,
            tags: { $in: ['tax', 'fiscal', 'declaration', 'déclaration'] },
            status: { $ne: 'done' },
            dueDate: { $lte: sevenDays },
          });
          return !!urgent;
        },
        action: async (user) => {
          await notifService.create(user._id, user.tenantId, {
            type: 'danger',
            title: '📒 Tax Deadline in 7 Days',
            message: 'A fiscal declaration deadline is approaching. Take action.',
            source: 'rule_engine',
            actionUrl: '/records',
          });
        },
      },
    ];
  }

  async run() {
    try {
      const users = await User.find({ isActive: true });
      for (const user of users) {
        const relevantRules = this.rules.filter(
          (r) =>
            r.profile === user.profileType ||
            (user.role === 'company_admin' && r.profile === 'company') ||
            (user.role === 'cabinet_admin' && r.profile === 'cabinet')
        );
        for (const rule of relevantRules) {
          try {
            const triggered = await rule.condition(user);
            if (triggered) await rule.action(user);
          } catch (err) {
            console.error(`[RuleEngine] Rule ${rule.id} failed for user ${user._id}:`, err.message);
          }
        }
      }
      console.log(`[RuleEngine] Run complete at ${new Date().toISOString()}`);
    } catch (err) {
      console.error('[RuleEngine] Fatal error during run:', err.message);
    }
  }
}

export const ruleEngine = new RuleEngine();
