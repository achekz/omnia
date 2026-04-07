import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    // 🔥 IMPORTANT: نفس الاسم الموجود في .env
    const uri = process.env.MONGO_URI;

    if (!uri) {
      throw new Error('❌ MONGO_URI is undefined. Check your .env file');
    }

    console.log('🔗 Connecting to MongoDB...');
    console.log('📍 URI (first 50 chars):', uri.substring(0, 50) + '...');

    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 5,
      maxIdleTimeMS: 30000,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`✅ Database: ${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    console.error('❌ Stack:', error.stack);
    process.exit(1);
  }
};

export default connectDB;