import mongoose from 'mongoose';

const { Schema } = mongoose;

const notificationSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
    },

    type: {
      type: String,
      enum: ['info', 'warning', 'danger'],
      default: 'info',
    },

    title: { type: String, required: true },
    message: String,

    isRead: { type: Boolean, default: false },

    source: {
      type: String,
      enum: ['rule_engine', 'ml', 'system', 'user'],
      default: 'system',
    },

    actionUrl: String,

    metadata: Schema.Types.Mixed,
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, isRead: 1 });

export default mongoose.model('Notification', notificationSchema);