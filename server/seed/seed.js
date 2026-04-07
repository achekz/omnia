import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../config/db.js';

// Models
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import Task from '../models/Task.js';
import Notification from '../models/Notification.js';
import ActivityLog from '../models/ActivityLog.js';
import FinancialRecord from '../models/FinancialRecord.js';
import MLPrediction from '../models/MLPrediction.js';

dotenv.config();
connectDB();

const run = async () => {
  try {
    // Clear all
    await User.deleteMany();
    await Organization.deleteMany();
    await Task.deleteMany();
    await Notification.deleteMany();
    await ActivityLog.deleteMany();
    await FinancialRecord.deleteMany();
    await MLPrediction.deleteMany();

    console.log('🧹 DB Cleared');

    // ── 1. COMPANY ORG ──
    const techCorp = await Organization.create({
      name: 'TechCorp SA',
      type: 'company',
      plan: 'pro',
      industry: 'Software',
      size: '50-200',
    });

    const companyAdmin = await User.create({
      name: 'Company Admin',
      email: 'company@demo.com',
      password: 'demo123',
      role: 'company_admin',
      profileType: 'company',
      tenantId: techCorp._id,
    });
    techCorp.ownerId = companyAdmin._id;

    const manager = await User.create({
      name: 'Tech Manager',
      email: 'manager@techcorp.com',
      password: 'demo123',
      role: 'manager',
      profileType: 'employee',
      tenantId: techCorp._id,
    });

    const emp1 = await User.create({ name: 'Alice', email: 'employee@demo.com', password: 'demo123', role: 'employee', profileType: 'employee', tenantId: techCorp._id });
    const emp2 = await User.create({ name: 'Bob', email: 'emp2@techcorp.com', password: 'demo123', role: 'employee', profileType: 'employee', tenantId: techCorp._id });
    const emp3 = await User.create({ name: 'Charlie', email: 'emp3@techcorp.com', password: 'demo123', role: 'employee', profileType: 'employee', tenantId: techCorp._id });

    techCorp.members = [companyAdmin._id, manager._id, emp1._id, emp2._id, emp3._id];
    await techCorp.save();

    // ── 2. CABINET ORG ──
    const cabinetOrg = await Organization.create({
      name: 'Cabinet Ben Ali',
      type: 'cabinet',
      plan: 'pro',
      industry: 'Accounting',
    });

    const cabinetAdmin = await User.create({
      name: 'Cabinet Admin',
      email: 'cabinet@demo.com',
      password: 'demo123',
      role: 'cabinet_admin',
      profileType: 'cabinet',
      tenantId: cabinetOrg._id,
    });
    cabinetOrg.ownerId = cabinetAdmin._id;
    cabinetOrg.members = [cabinetAdmin._id];
    await cabinetOrg.save();

    // ── 3. INDEPENDENT USERS ──
    const soloEmp = await User.create({
      name: 'Solo Employee',
      email: 'emp.solo@gmail.com',
      password: 'demo123',
      role: 'employee',
      profileType: 'employee',
    });

    const student = await User.create({
      name: 'Demo Student',
      email: 'student@demo.com',
      password: 'demo123',
      role: 'student',
      profileType: 'student',
    });

    console.log('👥 Users Created');

    // ── SEED TASKS FOR COMPANY ──
    const statuses = ['todo', 'in_progress', 'done', 'overdue'];
    for (let i = 0; i < 20; i++) {
      const assignedUser = [manager, emp1, emp2, emp3][i % 4];
      const s = statuses[Math.floor(Math.random() * statuses.length)];
      await Task.create({
        title: `TechCorp Project Task ${i + 1}`,
        status: s,
        priority: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)],
        assignedTo: assignedUser._id,
        createdBy: manager._id,
        tenantId: techCorp._id,
        dueDate: new Date(Date.now() + (Math.random() - 0.5) * 14 * 24 * 60 * 60 * 1000),
      });
    }

    // ── SEED TASKS FOR CABINET (Tax declarations) ──
    for (let i = 0; i < 10; i++) {
      await Task.create({
        title: `Déclaration fiscale Client ${i + 1}`,
        status: i < 3 ? 'done' : 'todo',
        priority: 'high',
        assignedTo: cabinetAdmin._id,
        createdBy: cabinetAdmin._id,
        tenantId: cabinetOrg._id,
        tags: ['declaration', 'fiscal', 'tax'],
        dueDate: new Date(Date.now() + (i - 2) * 24 * 60 * 60 * 1000), // Some overdue
      });
    }

    // ── SEED TASKS FOR STUDENT ──
    await Task.create({
      title: 'Mathematics Final Exam Prep',
      status: 'in_progress',
      priority: 'critical',
      assignedTo: student._id,
      createdBy: student._id,
      tags: ['exam'],
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    });

    for (let i = 0; i < 7; i++) {
      await Task.create({
        title: `Study session ${i + 1}`,
        status: 'todo',
        assignedTo: student._id,
        createdBy: student._id,
      });
    }

    // ── SEED ACTIVITY LOGS ──
    const users = [companyAdmin, manager, emp1, emp2, emp3, cabinetAdmin, soloEmp, student];
    for (const u of users) {
      for (let i = 0; i < 30; i++) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        await ActivityLog.create({
          userId: u._id,
          tenantId: u.tenantId,
          date,
          tasksCompleted: Math.floor(Math.random() * 5),
          activeMinutes: Math.floor(Math.random() * 180),
          loginCount: 1,
          score: Math.floor(Math.random() * 60) + 30, // 30-90
          studyHours: u.profileType === 'student' ? Math.random() * 4 : undefined,
        });
      }
    }
    // Update student's current month budget to trigger alert
    const firstOfMonth = new Date(); firstOfMonth.setDate(1); firstOfMonth.setHours(0,0,0,0);
    await ActivityLog.findOneAndUpdate(
      { userId: student._id, date: firstOfMonth },
      { budgetSpent: 420 },
      { upsert: true }
    );

    // ── SEED FINANCIAL RECORDS (CABINET) ──
    for (let i = 0; i < 30; i++) {
      const isAnomaly = i % 10 === 0;
      await FinancialRecord.create({
        tenantId: cabinetOrg._id,
        clientName: `Client ${Math.floor(i / 3) + 1}`,
        type: i % 4 === 0 ? 'income' : 'expense',
        amount: isAnomaly ? Math.random() * 20000 + 10000 : Math.random() * 1000 + 100,
        category: 'Services',
        date: new Date(Date.now() - i * 2 * 24 * 60 * 60 * 1000),
        isAnomaly,
        anomalyScore: isAnomaly ? 0.95 : 0.1,
      });
    }

    // ── SEED NOTIFICATIONS ──
    for (const u of users) {
      await Notification.create([
        { userId: u._id, tenantId: u.tenantId, title: 'Welcome to Omni AI!', message: 'Your workspace is ready.', type: 'success' },
        { userId: u._id, tenantId: u.tenantId, title: 'Profile Setup', message: 'Please complete your profile.', type: 'info' },
        { userId: u._id, tenantId: u.tenantId, title: 'System Update', message: 'New features available.', type: 'info' },
      ]);
    }

    console.log('✅ Seed Complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding Error:', error);
    process.exit(1);
  }
};

run();
