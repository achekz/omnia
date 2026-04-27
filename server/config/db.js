import mongoose from 'mongoose';

let reconnectTimer = null;
let isConnecting = false;
let lastConnectionFailureKey = null;
let lastConnectionFailureLoggedAt = 0;

const connectionOptions = {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  maxPoolSize: 10,
  minPoolSize: 5,
  maxIdleTimeMS: 30000,
};

const buildConnectionResult = ({ connected, error, errorCode, userMessage, uriUsed, isFallback = false, connection = null }) => ({
  connected,
  error,
  errorCode,
  userMessage,
  uriUsed,
  isFallback,
  connection,
});

export function parseMongoConnectionError(error) {
  const rawMessage = String(error?.message || 'MongoDB connection failed');
  const normalizedMessage = rawMessage.toLowerCase();
  const isWhitelistError = normalizedMessage.includes('whitelist') || normalizedMessage.includes("isn't whitelisted");
  const isSslError =
    normalizedMessage.includes('ssl') ||
    normalizedMessage.includes('tls') ||
    normalizedMessage.includes('openssl') ||
    normalizedMessage.includes('alert number 80');

  if (isWhitelistError) {
    return {
      errorCode: 'ATLAS_IP_NOT_WHITELISTED',
      userMessage: 'MongoDB Atlas blocked this IP. Add your current IP in Atlas Network Access.',
      shouldHighlightWhitelist: true,
    };
  }

  if (isSslError) {
    return {
      errorCode: 'MONGO_TLS_ERROR',
      userMessage: 'MongoDB connection failed during TLS handshake. Verify Atlas Network Access and your current network.',
      shouldHighlightWhitelist: false,
    };
  }

  return {
    errorCode: 'MONGO_CONNECTION_FAILED',
    userMessage: 'Unable to connect to MongoDB. Check your connection string and cluster status.',
    shouldHighlightWhitelist: false,
  };
}

function logConnectionFailure(error, metadata) {
  const failureKey = `${metadata.errorCode}:${metadata.userMessage}`;
  const now = Date.now();
  const shouldLogVerbose = failureKey !== lastConnectionFailureKey || now - lastConnectionFailureLoggedAt > 60000;

  if (shouldLogVerbose) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    if (metadata.shouldHighlightWhitelist) {
      console.error('💡 MongoDB Atlas blocked this IP. Add your current public IP in Atlas Network Access or use a fallback URI.');
    } else {
      console.error(`💡 ${metadata.userMessage}`);
    }
    lastConnectionFailureKey = failureKey;
    lastConnectionFailureLoggedAt = now;
    return;
  }

  console.warn(`⏳ MongoDB still unavailable (${metadata.errorCode}). Retrying automatically...`);
}

async function attemptConnection() {
  const primaryUri = process.env.MONGO_URI;
  const fallbackUri = process.env.MONGO_FALLBACK_URI;

  if (!primaryUri) {
    const error = new Error('MONGO_URI is undefined. Check your .env file');
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    return buildConnectionResult({
      connected: false,
      error,
      errorCode: 'MONGO_URI_MISSING',
      userMessage: 'MONGO_URI is missing in server/.env',
      uriUsed: null,
    });
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

      return buildConnectionResult({
        connected: true,
        connection: conn,
        uriUsed: uri,
        isFallback: Boolean(isFallback),
      });
    } catch (error) {
      const metadata = parseMongoConnectionError(error);
      logConnectionFailure(error, metadata);

      if (uri === primaryUri && fallbackUri) {
        console.error('↪️ Primary MongoDB failed. Trying MONGO_FALLBACK_URI...');
        continue;
      }

      return buildConnectionResult({
        connected: false,
        error,
        errorCode: metadata.errorCode,
        userMessage: metadata.userMessage,
        uriUsed: uri,
      });
    }
  }

  return buildConnectionResult({
    connected: false,
    error: new Error('No MongoDB URI could be connected'),
    errorCode: 'MONGO_CONNECTION_FAILED',
    userMessage: 'No MongoDB URI could be connected',
    uriUsed: null,
  });
}

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return buildConnectionResult({
      connected: true,
      connection: mongoose.connection,
      uriUsed: mongoose.connection.host,
    });
  }

  if (isConnecting || mongoose.connection.readyState === 2) {
    return buildConnectionResult({
      connected: false,
      error: new Error('MongoDB connection attempt already in progress'),
      errorCode: 'MONGO_CONNECTING',
      userMessage: 'MongoDB connection attempt already in progress',
      uriUsed: process.env.MONGO_URI || null,
    });
  }

  isConnecting = true;

  try {
    return await attemptConnection();
  } finally {
    isConnecting = false;
  }
};

export function startMongoReconnectLoop({ intervalMs = 15000, onReconnect } = {}) {
  if (reconnectTimer) {
    return reconnectTimer;
  }

  reconnectTimer = setInterval(async () => {
    if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2 || isConnecting) {
      return;
    }

    const result = await connectDB();

    if (result.connected && typeof onReconnect === 'function') {
      onReconnect(result);
    }
  }, intervalMs);

  if (typeof reconnectTimer.unref === 'function') {
    reconnectTimer.unref();
  }

  return reconnectTimer;
}

export function stopMongoReconnectLoop() {
  if (reconnectTimer) {
    clearInterval(reconnectTimer);
    reconnectTimer = null;
  }
}

export default connectDB;
