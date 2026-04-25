import VerificationCode from "../models/VerificationCode.js";
import { deliverVerificationCode } from "./otpDeliveryService.js";

const VERIFICATION_WINDOW_MS = 5 * 60 * 1000;

function generateOtpCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function createAndSendVerificationCode(payload) {
  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + VERIFICATION_WINDOW_MS);

  await VerificationCode.deleteMany({
    purpose: payload.purpose,
    $or: [
      payload.email ? { email: payload.email } : null,
      payload.phoneNumber ? { phoneNumber: payload.phoneNumber } : null,
    ].filter(Boolean),
  });

  const verification = new VerificationCode({
    ...payload,
    expiresAt,
  });

  await verification.setCode(code);
  await verification.save();

  try {
    const delivery = await deliverVerificationCode({
      method: payload.verificationMethod,
      email: payload.email,
      phoneNumber: payload.phoneNumber,
      code,
      firstName: payload.firstName,
    });

    return {
      verification,
      delivery,
      expiresAt,
    };
  } catch (error) {
    await VerificationCode.deleteOne({ _id: verification._id });
    throw error;
  }
}

export async function verifyOtpCode({ purpose, email, phoneNumber, code }) {
  const verification = await VerificationCode.findOne({
    purpose,
    ...(email ? { email } : { phoneNumber }),
  }).select("+codeHash");

  if (!verification) {
    return { verified: false, reason: "Verification request not found" };
  }

  if (verification.expiresAt.getTime() < Date.now()) {
    await VerificationCode.deleteOne({ _id: verification._id });
    return { verified: false, reason: "Verification code expired" };
  }

  const isMatch = await verification.compareCode(code);
  if (!isMatch) {
    return { verified: false, reason: "Invalid verification code" };
  }

  verification.verifiedAt = new Date();
  await verification.save();

  return { verified: true, verification };
}
