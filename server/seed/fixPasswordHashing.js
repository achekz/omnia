import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

async function fixPasswordHashing() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find all users
    const users = await User.find({}).select('+password');
    console.log(`📊 Found ${users.length} users\n`);

    let fixed = 0;
    let alreadyCorrect = 0;

    for (const user of users) {
      // Check if password is already bcrypt hashed
      const isBcryptHash = /^\$2[aby]\$\d{2}\$/.test(user.password);
      
      if (!isBcryptHash) {
        console.log(`❌ User ${user.email}: Password NOT properly hashed`);
        // Hash the password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
        await user.save();
        console.log(`✅ Fixed: ${user.email}\n`);
        fixed++;
      } else {
        alreadyCorrect++;
      }
    }

    console.log(`\n📈 Summary:`);
    console.log(`   ✅ Fixed: ${fixed}`);
    console.log(`   ✅ Already correct: ${alreadyCorrect}`);
    console.log(`   Total: ${users.length}\n`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixPasswordHashing();
