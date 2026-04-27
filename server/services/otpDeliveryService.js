import { sendEmailVerificationCode } from "./emailService.js";

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
