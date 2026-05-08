// Role du fichier: regroupe la logique metier reutilisable et les integrations externes.
import { sendEmailVerificationCode } from "./emailService.js";

// Role: Envoie un message ou une notification.
export async function deliverVerificationCode({
  method,
  email,
  code,
  firstName,
}) {
  if (method !== "email") {
    const error = new Error("Only email verification is supported.");
    error.code = "EMAIL_ONLY_VERIFICATION";
    throw error;
  }

  const result = await sendEmailVerificationCode(email, code, firstName);
  return {
    provider: "gmail",
    channel: "email",
    deliveryId: result.messageId,
  };
}
