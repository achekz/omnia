import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

async function updatePasswords() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    
    await mongoose.connect(process.env.MONGO_URI);
    
    console.log('✅ Connected to MongoDB');
    console.log('🔄 Updating existing passwords...');

    // Get all users
    const users = await User.find({}).select('+password');
    
    console.log(`📊 Found ${users.length} users`);

    let updated = 0;

    for (const user of users) {
      // Check if password is already hashed (bcrypt hashes start with $2a, $2b, or $2y)
      if (user.password && !user.password.startsWith('$2')) {
        try {
          // Hash the plain text password
          const hashedPassword = await bcrypt.hash(user.password, 12);
          user.password = hashedPassword;
          await user.save();
          console.log(`✅ Updated: ${user.email}`);
          updated++;
        } catch (err) {
          console.error(`❌ Error updating ${user.email}:`, err.message);
        }
      } else {
        console.log(`⏭️  Already hashed or no password: ${user.email}`);
      }
    }

    console.log(`\n🎉 Successfully updated ${updated} passwords`);
    
    // Show some user info
    console.log('\n📝 Sample users:');
    const sampleUsers = await User.find({}).select('email role profileType').limit(5);
    sampleUsers.forEach(u => {
      console.log(`  • ${u.email} (${u.role}) - ${u.profileType}`);
    });

    await mongoose.connection.close();
    console.log('\n✅ Done!');

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

updatePasswords();
