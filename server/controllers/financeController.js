import FinancialRecord from '../models/FinancialRecord.js';
import { ApiError, ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as mlService from '../services/mlService.js';
import * as notifService from '../services/notifService.js';

function buildFinanceFilter(req, extra = {}) {
  const filter = { ...extra };
  if (req.tenantId) {
    filter.tenantId = req.tenantId;
  }
  return filter;
}

function applyDateRange(filter, startDate, endDate) {
  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate);
    if (endDate) filter.date.$lte = new Date(endDate);
  }
  return filter;
}

function summarizeRecords(records) {
  const totalIncome = records.filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0);
  const totalExpense = records.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0);
  const balance = totalIncome - totalExpense;

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

  const monthlyMap = {};
  records.forEach(r => {
    const key = `${r.date.getFullYear()}-${String(r.date.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyMap[key]) monthlyMap[key] = { month: key, income: 0, expense: 0 };
    if (r.type === 'income') monthlyMap[key].income += r.amount;
    else monthlyMap[key].expense += r.amount;
  });

  const byMonth = Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month)).slice(-12);
  const anomalyCount = records.filter(r => r.isAnomaly).length;
  const recentAnomalies = records.filter(r => r.isAnomaly).sort((a, b) => b.date - a.date).slice(0, 5);

  return { totalIncome, totalExpense, balance, byCategory, byMonth, anomalyCount, recentAnomalies };
}

function escapeCsv(value) {
  const text = String(value ?? '');
  return /[;"\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

// GET /api/finance/records
export const getRecords = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, type, category, startDate, endDate } = req.query;

  const filter = buildFinanceFilter(req);
  if (type) filter.type = type;
  if (category) filter.category = category;
  applyDateRange(filter, startDate, endDate);

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [records, total] = await Promise.all([
    FinancialRecord.find(filter).sort({ date: -1 }).skip(skip).limit(parseInt(limit)),
    FinancialRecord.countDocuments(filter),
  ]);

  return res.json(new ApiResponse(200, { records, total }));
});

// POST /api/finance/records
export const createRecord = asyncHandler(async (req, res) => {
  const { clientName, type, amount, category, description, date, budgetLimit } = req.body;
  if (!type || !amount) throw new ApiError(400, 'type and amount are required');

  const record = await FinancialRecord.create({
    tenantId: req.tenantId,
    createdBy: req.user._id,
    clientName, type, amount, category, description, budgetLimit,
    date: date ? new Date(date) : new Date(),
  });

  // Auto anomaly check for large amounts
  if (amount > 1000) {
    const allAmounts = await FinancialRecord.find(buildFinanceFilter(req)).select('amount');
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
  const records = await FinancialRecord.find(buildFinanceFilter(req));
  return res.json(new ApiResponse(200, summarizeRecords(records)));
});

// GET /api/finance/anomalies
export const getAnomalies = asyncHandler(async (req, res) => {
  const anomalies = await FinancialRecord.find(buildFinanceFilter(req, { isAnomaly: true })).sort({ flaggedAt: -1 });
  return res.json(new ApiResponse(200, { anomalies }));
});

// GET /api/finance/reports
export const getReport = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const filter = applyDateRange(buildFinanceFilter(req), startDate, endDate);
  const records = await FinancialRecord.find(filter).sort({ date: -1 });
  const summary = summarizeRecords(records);
  const topCategory = [...(summary.byCategory || [])].sort((a, b) => b.total - a.total)[0] || null;

  return res.json(new ApiResponse(200, {
    generatedAt: new Date(),
    period: {
      startDate: startDate || null,
      endDate: endDate || null,
    },
    summary,
    totalRecords: records.length,
    topCategory,
    anomalyRate: records.length ? Math.round((summary.anomalyCount / records.length) * 100) : 0,
    records,
  }));
});

// GET /api/finance/export?format=csv|json
export const exportReport = asyncHandler(async (req, res) => {
  const { format = 'csv', startDate, endDate } = req.query;
  const filter = applyDateRange(buildFinanceFilter(req), startDate, endDate);
  const records = await FinancialRecord.find(filter).sort({ date: -1 }).lean();

  if (format === 'json') {
    return res.json(new ApiResponse(200, {
      generatedAt: new Date(),
      summary: summarizeRecords(records),
      records,
    }, 'Finance report exported'));
  }

  const header = ['date', 'clientName', 'type', 'category', 'description', 'amount', 'budgetLimit', 'isAnomaly'];
  const rows = records.map((record) => [
    record.date ? new Date(record.date).toISOString().slice(0, 10) : '',
    record.clientName || '',
    record.type || '',
    record.category || '',
    record.description || '',
    record.amount || 0,
    record.budgetLimit || '',
    record.isAnomaly ? 'yes' : 'no',
  ]);
  const csv = [header, ...rows].map((row) => row.map(escapeCsv).join(';')).join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="finance-report.csv"');
  return res.send(`\ufeff${csv}`);
});
