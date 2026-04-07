import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

async function diagnoseAccounts() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    const users = await User.find({}).select('+password');
    
    console.log(`📊 Found ${users.length} users\n`);
    console.log('─'.repeat(80));

    for (const user of users) {
      console.log(`\n📧 Email: ${user.email}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   ProfileType: ${user.profileType}`);
      console.log(`   Active: ${user.isActive}`);
      
      if (!user.password) {
        console.log(`   ❌ Password: MISSING!`);
      } else if (user.password.startsWith('$2')) {
        console.log(`   ✅ Password: Hashed (bcrypt) - ${user.password.substring(0, 30)}...`);
      } else if (user.password.length < 20) {
        console.log(`   ⚠️  Password: Plain text (NOT HASHED) - "${user.password}"`);
        console.log(`   💡 ACTION: Run: node seed/hashPasswords.js`);
      } else {
        console.log(`   ❓ Password: Unknown format - ${user.password.substring(0, 30)}...`);
      }
    }

    console.log(`\n${'─'.repeat(80)}\n`);
    
    if (users.length === 0) {
      console.log('ℹ️  No users found. Run: node seed/createTestAccount.js');
    }

    await mongoose.connection.close();
    console.log('✅ Diagnosis complete!');

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

diagnoseAccounts();
