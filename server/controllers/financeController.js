import FinancialRecord from '../models/FinancialRecord.js';
import { ApiError, ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as mlService from '../services/mlService.js';
import * as notifService from '../services/notifService.js';

// GET /api/finance/records
export const getRecords = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, type, category, startDate, endDate } = req.query;
  if (!req.tenantId) throw new ApiError(403, 'Tenant required');

  const filter = { tenantId: req.tenantId };
  if (type) filter.type = type;
  if (category) filter.category = category;
  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate);
    if (endDate) filter.date.$lte = new Date(endDate);
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [records, total] = await Promise.all([
    FinancialRecord.find(filter).sort({ date: -1 }).skip(skip).limit(parseInt(limit)),
    FinancialRecord.countDocuments(filter),
  ]);

  return res.json(new ApiResponse(200, { records, total }));
});

// POST /api/finance/records
export const createRecord = asyncHandler(async (req, res) => {
  if (!req.tenantId) throw new ApiError(403, 'Tenant required');
  const { clientName, type, amount, category, description, date, budgetLimit } = req.body;
  if (!type || !amount) throw new ApiError(400, 'type and amount are required');

  const record = await FinancialRecord.create({
    tenantId: req.tenantId,
    clientName, type, amount, category, description, budgetLimit,
    date: date ? new Date(date) : new Date(),
  });

  // Auto anomaly check for large amounts
  if (amount > 1000) {
    const allAmounts = await FinancialRecord.find({ tenantId: req.tenantId }).select('amount');
    const values = allAmounts.map(r => r.amount);
    const result = await mlService.detectAnomaly(values);
    if (result.is_anomaly) {
      record.isAnomaly = true;
      record.anomalyScore = result.anomaly_score;
      record.flaggedAt = new Date();
      await record.save();
      await notifService.create(req.user._id, req.tenantId, {
        type: 'danger',
        title: '🚨 Financial Anomaly',
        message: `Record of ${amount} flagged as anomaly.`,
        source: 'ml',
        actionUrl: '/finance',
      });
    }
  }

  return res.status(201).json(new ApiResponse(201, { record }, 'Record created'));
});

// GET /api/finance/summary
export const getSummary = asyncHandler(async (req, res) => {
  if (!req.tenantId) throw new ApiError(403, 'Tenant required');

  const records = await FinancialRecord.find({ tenantId: req.tenantId });
  const totalIncome = records.filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0);
  const totalExpense = records.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0);
  const balance = totalIncome - totalExpense;

  // By category
  const categoryMap = {};
  records.forEach(r => {
    const cat = r.category || 'Other';
    categoryMap[cat] = (categoryMap[cat] || 0) + r.amount;
  });
  const byCategory = Object.entries(categoryMap).map(([category, total]) => {
    const budget = records.find((record) => record.category === category && record.budgetLimit)?.budgetLimit || null;
    return {
      category,
      total,
      budget,
      overBudget: Boolean(budget && total > budget),
    };
  });

  // By month (last 6)
  const monthlyMap = {};
  records.forEach(r => {
    const key = `${r.date.getFullYear()}-${String(r.date.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyMap[key]) monthlyMap[key] = { month: key, income: 0, expense: 0 };
    if (r.type === 'income') monthlyMap[key].income += r.amount;
    else monthlyMap[key].expense += r.amount;
  });
  const byMonth = Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month)).slice(-6);

  const anomalyCount = records.filter(r => r.isAnomaly).length;
  const recentAnomalies = records.filter(r => r.isAnomaly).sort((a, b) => b.date - a.date).slice(0, 5);

  return res.json(new ApiResponse(200, { totalIncome, totalExpense, balance, byCategory, byMonth, anomalyCount, recentAnomalies }));
});

// GET /api/finance/anomalies
export const getAnomalies = asyncHandler(async (req, res) => {
  if (!req.tenantId) throw new ApiError(403, 'Tenant required');
  const anomalies = await FinancialRecord.find({ tenantId: req.tenantId, isAnomaly: true }).sort({ flaggedAt: -1 });
  return res.json(new ApiResponse(200, { anomalies }));
});
