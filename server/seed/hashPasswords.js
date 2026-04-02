import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

async function hashPlainPasswords() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const users = await User.find({}).select('+password');
    
    console.log(`📊 Found ${users.length} users\n`);

    let hashed = 0;
    let alreadyHashed = 0;
    let missing = 0;

    for (const user of users) {
      if (!user.password) {
        console.log(`⚠️  ${user.email}: NO PASSWORD`);
        missing++;
        continue;
      }

      if (user.password.startsWith('$2')) {
        console.log(`✅ ${user.email}: Already hashed`);
        alreadyHashed++;
        continue;
      }

      // This is plain text password - hash it
      try {
        console.log(`🔄 ${user.email}: Hashing password...`);
        const hashedPassword = await bcrypt.hash(user.password, 12);
        user.password = hashedPassword;
        await user.save();
        console.log(`   ✅ Hashed successfully!`);
        hashed++;
      } catch (err) {
        console.log(`   ❌ Error: ${err.message}`);
      }
    }

    console.log(`\n${'─'.repeat(60)}`);
    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Newly hashed: ${hashed}`);
    console.log(`   ✅ Already hashed: ${alreadyHashed}`);
    console.log(`   ⚠️  Missing password: ${missing}`);
    console.log(`\n`);

    if (missing > 0) {
      console.log('⚠️  WARNING: Some accounts have no password!');
      console.log('   Run: node seed/createTestAccount.js\n');
    }

    await mongoose.connection.close();
    console.log('✅ Done!');

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

hashPlainPasswords();
