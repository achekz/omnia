import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import User from '../models/User.js';

dotenv.config();
connectDB();

const fixPasswords = async () => {
  try {
    console.log('🔍 Checking and fixing passwords...\n');

    const users = await User.find().select('+password');
    console.log(`Found ${users.length} users\n`);

    for (const user of users) {
      console.log(`📧 ${user.email}`);
      console.log(`   Current password length: ${user.password.length}`);
      
      // Check if already bcrypt hashed
      const isBcrypted = /^\$2[aby]\$\d{2}\$/.test(user.password);
      console.log(`   Is bcrypted: ${isBcrypted}`);

      if (!isBcrypted) {
        console.log(`   ❌ NOT HASHED! Fixing...`);
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
        await user.save();
        console.log(`   ✅ Password fixed and saved\n`);
      } else {
        console.log(`   ✅ Already properly hashed\n`);
      }
    }

    console.log('✅ Password check complete!\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
};

fixPasswords();
