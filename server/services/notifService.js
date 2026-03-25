import Notification from '../models/Notification.js';
import { emitToUser } from '../config/socket.js';

export const create = async (userId, tenantId, { type, title, message, source, actionUrl, metadata }) => {
  const notif = await Notification.create({
    userId,
    tenantId,
    type: type || 'info',
    title,
    message,
    source: source || 'system',
    actionUrl,
    metadata,
  });

  // Emit real-time event to user
  try {
    emitToUser(userId.toString(), 'new_notification', {
      _id: notif._id,
      type: notif.type,
      title: notif.title,
      message: notif.message,
      source: notif.source,
      actionUrl: notif.actionUrl,
      isRead: false,
      createdAt: notif.createdAt,
    });
  } catch (_) {
    // Socket may not be connected – not fatal
  }

  return notif;
};
