import User from '../models/User.js';
import Task from '../models/Task.js';
import ActivityLog from '../models/ActivityLog.js';
import * as notifService from './notifService.js';

class RuleEngine {
  constructor() {
    this.rules = [
      // EMPLOYEE RULE
      {
        id: 'EMP_001',
        profile: 'employee',
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
            title: 'Overdue Tasks',
            message: 'You have 3+ overdue tasks',
          });
        },
      },
    ];
  }

  async run() {
    try {
      const users = await User.find({ isActive: true });

      for (const user of users) {
        const rules = this.rules.filter(
          (r) => r.profile === user.profileType
        );

        for (const rule of rules) {
          const triggered = await rule.condition(user);
          if (triggered) {
            await rule.action(user);
          }
        }
      }

      console.log("✅ Rule Engine executed");
    } catch (err) {
      console.error("❌ RuleEngine error:", err);
    }
  }
}

export const ruleEngine = new RuleEngine();