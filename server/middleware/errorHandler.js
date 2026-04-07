import { ApiError } from '../utils/ApiResponse.js';

export const errorHandler = (err, req, res, next) => {
  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    console.error(`❌ [ERROR] ${err.name}:`);
    console.error(`   Message: ${err.message}`);
    console.error(`   Stack: ${err.stack}`);
  }

  // ApiError (our custom errors)
  if (err instanceof ApiError) {
    if (isDev) {
      console.error(`   Status: ${err.statusCode}`);
    }
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors,
    });
  }

  // Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    if (isDev) console.error(`   Validation errors:`, messages);
    return res.status(400).json({ 
      success: false, 
      message: messages.join(', '),
      errors: messages 
    });
  }

  // Mongoose CastError (bad ObjectId)
  if (err.name === 'CastError') {
    if (isDev) console.error(`   Invalid ObjectId`);
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid resource ID' 
    });
  }

  // Duplicate key error (MongoDB code 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    if (isDev) console.error(`   Duplicate key on field: ${field}`);
    return res.status(409).json({
      success: false,
      message: `A record with this ${field} already exists`,
    });
  }

  // Default — 500
  const message = isDev ? err.message : 'Internal server error';
  console.error(`❌ [UNHANDLED ERROR] ${message}`);
  
  return res.status(500).json({
    success: false,
    message,
  });
};
