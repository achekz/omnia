import VerificationCode from "../models/VerificationCode.js";
import { deliverVerificationCode } from "./otpDeliveryService.js";
import { normalizeProfileType, normalizeRole } from "../utils/roleNormalization.js";

const VERIFICATION_WINDOW_MS = 5 * 60 * 1000;

function generateOtpCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function createAndSendVerificationCode(payload) {
  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + VERIFICATION_WINDOW_MS);
  const role = normalizeRole(payload.role, "employee");
  const normalizedPayload = {
    ...payload,
    email: payload.email?.trim().toLowerCase(),
    role,
    profileType: normalizeProfileType(payload.profileType || role, role),
    verificationMethod: "email",
  };

  await VerificationCode.deleteMany({
    purpose: normalizedPayload.purpose,
    $or: [
      normalizedPayload.email ? { email: normalizedPayload.email } : null,
      normalizedPayload.phoneNumber ? { phoneNumber: normalizedPayload.phoneNumber } : null,
    ].filter(Boolean),
  });

  const verification = new VerificationCode({
    ...normalizedPayload,
    expiresAt,
  });

  await verification.setCode(code);
  await verification.save();

  const delivery = await deliverVerificationCode({
    method: normalizedPayload.verificationMethod,
    email: normalizedPayload.email,
    phoneNumber: normalizedPayload.phoneNumber,
    code,
    firstName: normalizedPayload.firstName,
  });

  return {
    verification,
    delivery,
    expiresAt,
  };
}

export async function verifyOtpCode({ purpose, email, phoneNumber, code }) {
  const normalizedEmail = email?.trim().toLowerCase();
  const verification = await VerificationCode.findOne({
    purpose,
    ...(normalizedEmail ? { email: normalizedEmail } : { phoneNumber }),
  }).select("+codeHash");

  if (!verification) {
    return { verified: false, reason: "Verification request not found" };
  }

  if (verification.expiresAt.getTime() < Date.now()) {
    await VerificationCode.deleteOne({ _id: verification._id });
    return { verified: false, reason: "Verification code expired" };
  }

  if (verification.consumedAt) {
    return { verified: false, reason: "Verification code already used" };
  }

  const isMatch = await verification.compareCode(code);

  if (!isMatch) {
    return { verified: false, reason: "Invalid verification code" };
  }

  verification.verifiedAt = new Date();
  await verification.save();

  return { verified: true, verification };
}
