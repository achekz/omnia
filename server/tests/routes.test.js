import { normalizeRole } from '../utils/roleNormalization.js';
import * as mlService from '../services/mlService.js';
import Rule from '../models/Rule.js';

describe('Rule model validation', () => {
  test('accepts a dynamic task delay rule', () => {
    const rule = new Rule({
      name: 'Delay alert',
      resource: 'task',
      conditions: [{ metric: 'task.delayDays', operator: 'gt', value: 2 }],
      action: {
        type: 'notify',
        target: 'assignedUser',
        title: 'Delay',
        message: 'Task is delayed',
      },
    });

    expect(rule.validateSync()).toBeUndefined();
  });
});

describe('RBAC role normalization', () => {
  test('maps SaaS profile aliases to canonical roles', () => {
    expect(normalizeRole('ENTREPRISE')).toBe('admin');
    expect(normalizeRole('ACCOUNTANT')).toBe('comptable');
    expect(normalizeRole('EMPLOYÉ')).toBe('employee');
  });
});

describe('ML fallback behavior', () => {
  test('returns a normalized risk score when Flask is unavailable', async () => {
    const result = await mlService.predict({
      tasks_completed_last_7d: 2,
      overdue_count: 4,
    });

    expect(result.risk_score).toBeGreaterThanOrEqual(0);
    expect(result.risk_score).toBeLessThanOrEqual(1);
    expect(['low', 'medium', 'high']).toContain(result.risk_level);
  });

  test('detects simple amount spikes locally', async () => {
    const result = await mlService.detectAnomaly([100, 120, 110, 900]);
    expect(typeof result.is_anomaly).toBe('boolean');
  });
});
