import { ApiError } from '../utils/ApiResponse.js';
import { parseMongoConnectionError } from '../config/db.js';

const errorHandler = (err, req, res, next) => {
  const isDev = process.env.NODE_ENV === 'development';

  // 🔴 LOG ERROR
  if (isDev) {
    console.error(`❌ [ERROR] ${err.name}`);
    console.error(`Message: ${err.message}`);
    console.error(err.stack);
  }

  // ========================
  // CUSTOM API ERROR
  // ========================
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors || [],
    });
  }

  // ========================
  // MONGOOSE VALIDATION ERROR
  // ========================
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);

    return res.status(400).json({
      success: false,
      message: messages.join(', '),
      errors: messages,
    });
  }

  // ========================
  // INVALID OBJECT ID
  // ========================
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid resource ID',
    });
  }

  // ========================
  // DUPLICATE KEY ERROR
  // ========================
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';

    return res.status(409).json({
      success: false,
      message: `A record with this ${field} already exists`,
    });
  }

  // ========================
  // MONGODB CONNECTION ERROR
  // ========================
  if (err.name === 'MongooseServerSelectionError' || err.name === 'MongoServerSelectionError') {
    const metadata = parseMongoConnectionError(err);

    return res.status(503).json({
      success: false,
      message: 'Database temporarily unavailable',
      code: metadata.errorCode,
      details: metadata.userMessage,
    });
  }

  // ========================
  // DEFAULT ERROR
  // ========================
  console.error('❌ [UNHANDLED ERROR]:', err.message);

  return res.status(500).json({
    success: false,
    message: isDev ? err.message : 'Internal server error',
  });
};

export default errorHandler;
