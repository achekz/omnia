import mongoose from 'mongoose';

const requireDatabase = (req, res, next) => {
  if (mongoose.connection.readyState === 1) {
    return next();
  }

  const appMongoStatus = req.app.locals.mongoStatus || {};
  const staleConnectedState = appMongoStatus.code === 'MONGO_CONNECTED' || appMongoStatus.connected === true;
  const mongoCode = staleConnectedState
    ? 'MONGO_CONNECTION_LOST'
    : (appMongoStatus.code || 'MONGO_UNAVAILABLE');
  const mongoMessage = staleConnectedState
    ? 'MongoDB connection was lost. Restart the backend and verify Atlas Network Access.'
    : (appMongoStatus.message || 'MongoDB is currently unavailable');

  return res.status(503).json({
    success: false,
    message: 'Database temporarily unavailable',
    code: mongoCode,
    details: mongoMessage,
  });
};

export default requireDatabase;
