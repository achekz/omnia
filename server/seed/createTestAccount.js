import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

async function createTestAccount() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Test credentials
    const testEmail = 'test@omniAI.com';
    const testPassword = 'Test@12345';

    console.log('📝 Creating test account:');
    console.log(`   Email: ${testEmail}`);
    console.log(`   Password: ${testPassword}\n`);

    // Delete if exists
    await User.deleteOne({ email: testEmail });

    // Create user
    const user = await User.create({
      firstName: 'Test',
      lastName: 'User',
      email: testEmail,
      phoneNumber: '+21620000123',
      city: 'tunisia',
      password: testPassword,
      role: 'employee',
      profileType: 'employee',
      verificationMethod: 'email',
      gender: 'male',
      isVerified: true,
      isActive: true,
    });

    console.log('✅ Test account created successfully!\n');
    console.log('🔑 Login credentials:');
    console.log(`   Email: ${testEmail}`);
    console.log(`   Password: ${testPassword}\n`);

    // Verify password works
    const userWithPassword = await User.findById(user._id).select('+password');
    const passwordMatch = await userWithPassword.comparePassword(testPassword);
    
    if (passwordMatch) {
      console.log('✅ Password verification: SUCCESS');
      console.log('   You can now login with these credentials!\n');
    } else {
      console.log('❌ Password verification: FAILED\n');
    }

    // Show all users in DB
    const allUsers = await User.find({}).select('email name role profileType');
    console.log(`📊 Total users in database: ${allUsers.length}`);
    console.log('Users:');
    allUsers.forEach(u => {
      console.log(`  • ${u.email} (${u.role}) - ${u.name}`);
    });

    await mongoose.connection.close();
    console.log('\n✅ Done!');

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err);
    process.exit(1);
  }
}

createTestAccount();
