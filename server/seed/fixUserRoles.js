import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import User from '../models/User.js';
import dotenv from 'dotenv';

dotenv.config();
connectDB();

const fixUserRoles = async () => {
  try {
    console.log('🔧 Fixing invalid user roles...');

    // Map invalid → valid UPPERCASE
    const roleMap = {
      'user': 'USER',
      'employee': 'EMPLOYEE',
      'company_admin': 'COMPANY_ADMIN',
      'cabinet_admin': 'CABINET_ADMIN',
      'manager': 'MANAGER',
      'admin': 'ADMIN'
    };

    let updated = 0;
    let deleted = 0;

    // Fix existing users
    for (const [invalidRole, validRole] of Object.entries(roleMap)) {
      const invalidUsers = await User.find({ role: invalidRole });
      console.log(`📊 Found ${invalidUsers.length} users with role '${invalidRole}'`);

      for (const user of invalidUsers) {
        await User.findByIdAndUpdate(user._id, { role: validRole });
        updated++;
      }
    }

    // Delete users with completely unknown roles (cleanup)
    const unknownRoles = await User.distinct('role', { 
      role: { $nin: ['ADMIN', 'MANAGER', 'EMPLOYEE', 'STUDENT', 'ACCOUNTANT', 'USER', 'COMPANY_ADMIN', 'CABINET_ADMIN'] } 
    });
    if (unknownRoles.length > 0) {
      await User.deleteMany({ role: { $in: unknownRoles } });
      deleted = await User.countDocuments({ role: { $in: unknownRoles } });
      console.log(`🗑️  Deleted ${deleted} users with unknown roles: ${unknownRoles.join(', ')}`);
    }

    // Verify all users have valid roles
    const users = await User.find({});
    const validCount = users.filter(u => ['ADMIN','MANAGER','EMPLOYEE','STUDENT','ACCOUNTANT','USER','COMPANY_ADMIN','CABINET_ADMIN'].includes(u.role)).length;
    console.log(`✅ Summary: Fixed ${updated} users, deleted ${deleted}, ${validCount}/${users.length} valid`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
};

fixUserRoles();
