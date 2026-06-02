// Role du fichier: regroupe la logique metier reutilisable et les integrations externes.
import { emitToUser } from '../config/socket.js';
import { saveNotification } from './persistenceService.js';

// Role: Construit des donnees derivees.
function resolveRedirectTarget(target, metadata = {}) {
  const rawTarget = target || '/notifications';
  return String(rawTarget)
    .replaceAll('{taskId}', metadata.taskId || '')
    .replaceAll('{recordId}', metadata.recordId || '')
    .replaceAll('{userId}', metadata.userId || '');
}

// Role: Cree une nouvelle ressource.
export const create = async (userId, tenantId, { type, title, message, source, redirectTarget, actionUrl, metadata }) => {
  const resolvedRedirectTarget = resolveRedirectTarget(redirectTarget || actionUrl, metadata);

  const notif = await saveNotification({
    userId,
    tenantId,
    type: type || 'info',
    title,
    message,
    source: source || 'system',
    redirectTarget: resolvedRedirectTarget,
    actionUrl: resolvedRedirectTarget,
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
      redirectTarget: notif.redirectTarget,
      actionUrl: notif.actionUrl,
      metadata: notif.metadata,
      isRead: false,
      createdAt: notif.createdAt,
    });
  } catch (_) {
    // Socket may not be connected – not fatal
  }

  return notif;
};
