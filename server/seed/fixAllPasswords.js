import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

async function fixAllPasswords() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected\n');

    const users = await User.find({}).select('+password');
    
    console.log(`📊 Found ${users.length} users\n`);
    console.log('🔧 Fixing passwords...\n');

    let fixed = 0;

    for (const user of users) {
      // Set a default password
      const defaultPassword = 'Password@123';
      
      // Hash it properly (ONLY ONCE)
      const hashedPassword = await bcrypt.hash(defaultPassword, 12);
      
      // Update directly
      await User.updateOne(
        { _id: user._id },
        { $set: { password: hashedPassword } }
      );

      console.log(`✅ Fixed: ${user.email}`);
      console.log(`   New password: ${defaultPassword}\n`);
      fixed++;
    }

    console.log(`${'─'.repeat(60)}`);
    console.log(`\n✅ Fixed ${fixed} accounts!\n`);
    console.log(`📝 ALL accounts now use:`)
    console.log(`   Password: Password@123\n`);

    // Show all users
    const allUsers = await User.find({}).select('email name role profileType');
    console.log(`📧 Available accounts:`);
    allUsers.forEach(u => {
      console.log(`   • ${u.email} (${u.role})`);
    });

    await mongoose.connection.close();
    console.log('\n✅ Done! Try logging in now.');

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

fixAllPasswords();
