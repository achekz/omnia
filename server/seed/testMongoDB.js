import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function testMongoDB() {
  console.log('🔍 Testing MongoDB Connection...\n');

  // Check env variable
  const mongoUri = process.env.MONGO_URI;
  
  console.log('📋 Configuration Check:');
  console.log(`   MONGO_URI defined: ${mongoUri ? '✅ Yes' : '❌ No'}`);
  
  if (!mongoUri) {
    console.error('\n❌ MONGO_URI not found in .env file');
    console.error('   Please create a .env file in server/ directory');
    console.error('   with: MONGO_URI=mongodb+srv://...\n');
    process.exit(1);
  }

  console.log(`   URI preview: ${mongoUri.substring(0, 50)}...\n`);

  // Test connection
  console.log('🔗 Attempting connection...');
  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 5,
    });

    console.log('✅ Connection successful!\n');
    console.log('📊 Database Info:');
    console.log(`   Host: ${conn.connection.host}`);
    console.log(`   Database: ${conn.connection.name}`);
    console.log(`   State: ${conn.connection.readyState === 1 ? 'Connected' : 'Not connected'}`);
    
    // Try to count collections
    try {
      const db = conn.connection.db;
      const collections = await db.listCollections().toArray();
      console.log(`   Collections: ${collections.length}`);
      collections.forEach(c => console.log(`     - ${c.name}`));
    } catch (e) {
      console.log(`   Collections: Could not list`);
    }

    console.log('\n✅ Everything looks good! You can now register accounts.\n');
    process.exit(0);

  } catch (error: any) {
    console.error('❌ Connection failed!\n');
    console.error('❌ Error:', error.message);
    
    // Provide diagnostic tips
    console.error('\n🔧 Troubleshooting tips:\n');
    
    if (error.message.includes('authentication failed')) {
      console.error('   • Check your MONGO_URI username and password');
      console.error('   • Ensure no special characters are URL-encoded');
    } else if (error.message.includes('ENOTFOUND')) {
      console.error('   • Check your internet connection');
      console.error('   • Verify the cluster hostname in MONGO_URI');
    } else if (error.message.includes('connect ECONNREFUSED')) {
      console.error('   • Check if MongoDB server is running');
      console.error('   • Or if using Atlas, check your IP whitelist');
    } else if (error.message.includes('ServerSelectionTimeout')) {
      console.error('   • Check your network/firewall settings');
      console.error('   • Add your IP to MongoDB Atlas Network Access');
      console.error('   • Go to: https://cloud.mongodb.com -> Network Access');
    }
    
    console.error('\n📝 Full error stack:');
    console.error(error.stack);
    
    process.exit(1);
  }
}

testMongoDB();
