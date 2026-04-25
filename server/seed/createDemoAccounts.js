import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import User from '../models/User.js';
import Organization from '../models/Organization.js';

dotenv.config();
connectDB();

const createDemoAccounts = async () => {
  try {
    console.log('🔄 Creating demo accounts with proper password hashing...\n');

    // Clear existing test accounts
    const testEmails = ['company@demo.com', 'manager@techcorp.com', 'employee@demo.com', 'cabinet@demo.com', 'emp.solo@gmail.com', 'student@demo.com'];
    await User.deleteMany({ email: { $in: testEmails } });
    console.log('✅ Cleared old test accounts\n');

    // ── 1. COMPANY ORG ──
    let techCorp = await Organization.findOne({ name: 'TechCorp SA' });
    if (!techCorp) {
      techCorp = await Organization.create({
        name: 'TechCorp SA',
        type: 'company',
        plan: 'pro',
      });
      console.log('✅ Created TechCorp organization');
    }

    // Create company admin
    const companyAdmin = await User.create({
      name: 'Company Admin',
      email: 'company@demo.com',
      password: 'demo123', // Will be hashed by pre-save hook
      role: 'COMPANY_ADMIN',
      profileType: 'company',
      tenantId: techCorp._id,
      isActive: true,
    });
    console.log('✅ Created company@demo.com (password: demo123)');

    techCorp.ownerId = companyAdmin._id;
    techCorp.members = [companyAdmin._id];
    await techCorp.save();

    // Create manager
    await User.create({
      name: 'Tech Manager',
      email: 'manager@techcorp.com',
      password: 'demo123',
      role: 'MANAGER',
      profileType: 'employee',
      tenantId: techCorp._id,
      isActive: true,
    });
    console.log('✅ Created manager@techcorp.com (password: demo123)');

    // Create employee
    await User.create({
      name: 'Alice Employee',
      email: 'employee@demo.com',
      password: 'demo123',
      role: 'USER',
      profileType: 'employee',
      tenantId: techCorp._id,
      isActive: true,
    });
    console.log('✅ Created employee@demo.com (password: demo123)');

    // ── 2. CABINET ORG ──
    let cabinetOrg = await Organization.findOne({ name: 'Cabinet Ben Ali' });
    if (!cabinetOrg) {
      cabinetOrg = await Organization.create({
        name: 'Cabinet Ben Ali',
        type: 'cabinet',
        plan: 'pro',
      });
      console.log('✅ Created Cabinet organization');
    }

    const cabinetAdmin = await User.create({
      name: 'Cabinet Admin',
      email: 'cabinet@demo.com',
      password: 'demo123',
      role: 'CABINET_ADMIN',
      profileType: 'cabinet',
      tenantId: cabinetOrg._id,
      isActive: true,
    });
    console.log('✅ Created cabinet@demo.com (password: demo123)');

    cabinetOrg.ownerId = cabinetAdmin._id;
    cabinetOrg.members = [cabinetAdmin._id];
    await cabinetOrg.save();

    // ── 3. INDEPENDENT USERS ──
    await User.create({
      name: 'Solo Employee',
      email: 'emp.solo@gmail.com',
      password: 'demo123',
      role: 'USER',
      profileType: 'employee',
      isActive: true,
    });
    console.log('✅ Created emp.solo@gmail.com (password: demo123)');

    await User.create({
      name: 'Demo Student',
      email: 'student@demo.com',
      password: 'demo123',
      role: 'USER',
      profileType: 'student',
      isActive: true,
    });
    console.log('✅ Created student@demo.com (password: demo123)');

    console.log('\n✅ All demo accounts created successfully!');
    console.log('\n📝 Test Credentials:');
    console.log('─ company@demo.com / demo123');
    console.log('─ manager@techcorp.com / demo123');
    console.log('─ employee@demo.com / demo123');
    console.log('─ cabinet@demo.com / demo123');
    console.log('─ emp.solo@gmail.com / demo123');
    console.log('─ student@demo.com / demo123\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
};

createDemoAccounts();
