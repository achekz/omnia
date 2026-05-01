import Notification from '../models/Notification.js';
import { ApiError, ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// GET /api/notifications
export const getNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 'all', unreadOnly } = req.query;
  const filter = { userId: req.user._id };
  if (unreadOnly === 'true') filter.isRead = false;

  const normalizedLimit = limit === 'all'
    ? 0
    : Math.min(200, Math.max(1, parseInt(limit, 10) || 100));
  const skip = normalizedLimit ? (Math.max(1, parseInt(page, 10) || 1) - 1) * normalizedLimit : 0;
  const query = Notification.find(filter).sort({ createdAt: -1 }).skip(skip);

  if (normalizedLimit) {
    query.limit(normalizedLimit);
  }

  const [notifications, total, unreadCount] = await Promise.all([
    query,
    Notification.countDocuments(filter),
    Notification.countDocuments({ userId: req.user._id, isRead: false }),
  ]);

  return res.json(new ApiResponse(200, { notifications, total, unreadCount }));
});

// PATCH /api/notifications/:id/read
export const markRead = asyncHandler(async (req, res) => {
  const notif = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { isRead: true },
    { new: true }
  );
  if (!notif) throw new ApiError(404, 'Notification not found');
  return res.json(new ApiResponse(200, { notif }));
});

// PATCH /api/notifications/read-all
export const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ userId: req.user._id, isRead: false }, { isRead: true });
  return res.json(new ApiResponse(200, {}, 'All notifications marked as read'));
});

// DELETE /api/notifications/:id
export const deleteNotification = asyncHandler(async (req, res) => {
  const notif = await Notification.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!notif) throw new ApiError(404, 'Notification not found');
  return res.json(new ApiResponse(200, {}, 'Notification deleted'));
});

// DELETE /api/notifications/clear-all
export const clearAll = asyncHandler(async (req, res) => {
  await Notification.deleteMany({ userId: req.user._id, isRead: true });
  return res.json(new ApiResponse(200, {}, 'Read notifications cleared'));
});
