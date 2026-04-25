import mongoose from 'mongoose';

const connectDB = async () => {
  const primaryUri = process.env.MONGO_URI;
  const fallbackUri = process.env.MONGO_FALLBACK_URI;
  const connectionOptions = {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
    minPoolSize: 5,
    maxIdleTimeMS: 30000,
  };

  if (!primaryUri) {
    const error = new Error('MONGO_URI is undefined. Check your .env file');
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    return {
      connected: false,
      error,
      errorCode: 'MONGO_URI_MISSING',
      userMessage: 'MONGO_URI is missing in server/.env',
      uriUsed: null,
    };
  }

  const urisToTry = [primaryUri, fallbackUri].filter(Boolean);

  for (const uri of urisToTry) {
    try {
      const isFallback = uri === fallbackUri && fallbackUri;
      console.log(`🔗 Connecting to MongoDB${isFallback ? ' fallback' : ''}...`);
      console.log('📍 URI (first 50 chars):', `${uri.substring(0, 50)}...`);

      const conn = await mongoose.connect(uri, connectionOptions);

      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
      console.log(`✅ Database: ${conn.connection.name}`);

      return {
        connected: true,
        connection: conn,
        uriUsed: uri,
        isFallback: Boolean(isFallback),
      };
    } catch (error) {
      console.error(`❌ MongoDB Connection Error: ${error.message}`);
      const isWhitelistError = error.message.includes('whitelist');

      if (isWhitelistError) {
        console.error('💡 MongoDB Atlas blocked this IP. Add your current public IP in Atlas Network Access or use a fallback URI.');
      }

      if (uri === primaryUri && fallbackUri) {
        console.error('↪️ Primary MongoDB failed. Trying MONGO_FALLBACK_URI...');
        continue;
      }

      return {
        connected: false,
        error,
        errorCode: isWhitelistError ? 'ATLAS_IP_NOT_WHITELISTED' : 'MONGO_CONNECTION_FAILED',
        userMessage: isWhitelistError
          ? 'MongoDB Atlas blocked this IP. Add your current IP in Atlas Network Access.'
          : 'Unable to connect to MongoDB. Check your connection string and cluster status.',
        uriUsed: uri,
      };
    }
  }

  return {
    connected: false,
    error: new Error('No MongoDB URI could be connected'),
    errorCode: 'MONGO_CONNECTION_FAILED',
    userMessage: 'No MongoDB URI could be connected',
    uriUsed: null,
  };
};

export default connectDB;
