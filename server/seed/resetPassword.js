import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

async function resetPassword(emailArg, passwordArg) {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Use command line arguments or defaults
    const email = emailArg || 'ranyme13@gmail.com';
    const newPassword = passwordArg || 'Password@123';

    console.log(`🔑 Resetting password for: ${email}`);
    console.log(`   New password: ${newPassword}\n`);

    const user = await User.findOne({ email });
    
    if (!user) {
      console.log(`❌ User not found: ${email}`);
      console.log(`\n📧 Available emails in database:`);
      const allUsers = await User.find({}).select('email name');
      allUsers.forEach(u => console.log(`   • ${u.email}`));
    } else {
      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      user.password = hashedPassword;
      await user.save();

      console.log(`✅ Password reset successfully!\n`);
      console.log(`📝 Login credentials:`);
      console.log(`   Email: ${email}`);
      console.log(`   Password: ${newPassword}\n`);

      // Verify it works
      const userWithPassword = await User.findById(user._id).select('+password');
      const match = await userWithPassword.comparePassword(newPassword);
      
      if (match) {
        console.log(`✅ Password verification: SUCCESS`);
      } else {
        console.log(`❌ Password verification: FAILED`);
      }
    }

    await mongoose.connection.close();
    console.log('\n✅ Done!');

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

// Get email and password from command line or use defaults
const email = process.argv[2];
const password = process.argv[3];

resetPassword(email, password);
