import User from "../models/User.js";
import VerificationCode from "../models/VerificationCode.js";
import mongoose from "mongoose";
import {
  sendEmailVerificationCode,
  sendPasswordResetCode,
  verifyEmailTransport,
} from "../services/emailService.js";
import { ApiError, ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validatePhoneNumberByCity } from "../services/phoneValidationService.js";
import { createAndSendVerificationCode, verifyOtpCode } from "../services/verificationCodeService.js";
import { normalizeProfileType, normalizeRole } from "../utils/roleNormalization.js";
import * as notifService from "../services/notifService.js";

const RESET_CODE_WINDOW_MS = 5 * 60 * 1000;
const MAX_RESET_CODE_ATTEMPTS = 5;

function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function sanitizeUser(user) {
  const normalizedRole = normalizeRole(user.role, "employee");
  const normalizedProfileType = normalizeProfileType(user.profileType || normalizedRole, normalizedRole);

  return {
    _id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    name: user.name,
    email: user.email,
    phoneNumber: user.phoneNumber,
    city: user.city,
    verificationMethod: user.verificationMethod,
    role: normalizedRole,
    profileType: normalizedProfileType,
    gender: user.gender,
    isVerified: user.isVerified,
    avatar: user.avatar,
    tenantId: user.tenantId,
    preferences: user.preferences,
    createdAt: user.createdAt,
  };
}

export const sendCode = asyncHandler(async (req, res) => {
  const { firstName, lastName, gender, phoneNumber, city, verificationMethod } = req.body;
  const role = normalizeRole(req.body.role, "employee");
  const profileType = normalizeProfileType(req.body.profileType || role, role);
  const email = req.body.email?.trim().toLowerCase();

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(409, "Email already registered");
  }

  const phoneValidation = validatePhoneNumberByCity(city, phoneNumber);
  if (!phoneValidation.valid) {
    throw new ApiError(400, phoneValidation.message);
  }

  if (verificationMethod !== "email") {
    throw new ApiError(400, "Verification method must be email");
  }

  const phoneUser = await User.findOne({ phoneNumber: phoneValidation.phoneNumber });
  if (phoneUser) {
    throw new ApiError(409, "Phone number already registered");
  }

  try {
    const { expiresAt, delivery } = await createAndSendVerificationCode({
      purpose: "register",
      firstName,
      lastName,
      email,
      phoneNumber: phoneValidation.phoneNumber,
      city: phoneValidation.normalizedCity,
      role,
      profileType,
      gender,
      verificationMethod,
    });

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          email,
          phoneNumber: phoneValidation.phoneNumber,
          city: phoneValidation.normalizedCity,
          verificationMethod,
          expiresAt,
          delivery,
        },
        "Verification code sent",
      ),
    );
  } catch (error) {
    console.error("[AUTH] Failed to send verification code email:", {
      email,
      phoneNumber,
      city,
      verificationMethod,
      message: error.message,
      code: error.code,
      response: error.response,
      responseCode: error.responseCode,
      attemptedModes: error.attemptedModes,
    });
    throw new ApiError(500, error.message || "Failed to send verification code");
  }
});

export const verifyCode = asyncHandler(async (req, res) => {
  const code = req.body.code;
  const email = req.body.email?.trim().toLowerCase();
  const phoneNumber = req.body.phoneNumber?.trim();

  const result = await verifyOtpCode({
    purpose: "register",
    email,
    phoneNumber,
    code,
  });

  if (!result.verified) {
    throw new ApiError(result.reason === "Verification request not found" ? 404 : 400, result.reason);
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        email,
        phoneNumber,
        verified: true,
      },
      "Email verified successfully",
    ),
  );
});

export const register = asyncHandler(async (req, res) => {
  const { firstName, lastName, gender, password, phoneNumber, city, verificationMethod } = req.body;
  const role = normalizeRole(req.body.role, "employee");
  const profileType = normalizeProfileType(req.body.profileType || role, role);
  const email = req.body.email?.trim().toLowerCase();
  const phoneValidation = validatePhoneNumberByCity(city, phoneNumber);

  if (mongoose.connection.readyState !== 1) {
    console.error("[AUTH] Registration blocked because MongoDB is not connected.", {
      readyState: mongoose.connection.readyState,
    });
    throw new ApiError(503, "Database is not connected. Please try again.");
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(409, "Email already registered");
  }

  const verification = await VerificationCode.findOne({ purpose: "register", email });
  if (!verification || !verification.verifiedAt) {
    throw new ApiError(400, "Email must be verified before registration");
  }

  if (verification.expiresAt.getTime() < Date.now()) {
    await VerificationCode.deleteOne({ _id: verification._id });
    throw new ApiError(400, "Verification session expired");
  }

  if (!phoneValidation.valid) {
    throw new ApiError(400, phoneValidation.message);
  }

  const payloadMatches =
    verification.firstName === firstName &&
    verification.lastName === lastName &&
    normalizeRole(verification.role, "employee") === role &&
    verification.gender === gender &&
    verification.phoneNumber === phoneValidation.phoneNumber &&
    verification.city === phoneValidation.normalizedCity &&
    verification.verificationMethod === verificationMethod;

  if (!payloadMatches) {
    throw new ApiError(400, "Registration details do not match the verified identity");
  }

  const user = new User({
    firstName,
    lastName,
    email,
    phoneNumber: phoneValidation.phoneNumber,
    city: verification.city,
    password,
    role,
    profileType,
    gender,
    verificationMethod,
    isVerified: true,
    isActive: true,
  });

  await user.save();

  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  user.refreshToken = refreshToken;
  await user.save();

  const savedUser = await User.findById(user._id).select("_id email role createdAt");
  if (!savedUser) {
    console.error("[AUTH] User creation completed but document was not found in MongoDB.", {
      email,
      userId: user._id,
      database: mongoose.connection.name,
    });
    throw new ApiError(500, "Account was not persisted to the database");
  }

  console.log("[AUTH] User registered and saved to MongoDB Atlas.", {
    userId: savedUser._id,
    email: savedUser.email,
    role: savedUser.role,
    database: mongoose.connection.name,
  });

  await VerificationCode.deleteMany({ purpose: "register", email });

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        user: sanitizeUser(user),
        accessToken,
        refreshToken,
      },
      "Registered successfully",
    ),
  );
});

export const login = asyncHandler(async (req, res) => {
  const { password } = req.body;
  const email = req.body.email?.trim().toLowerCase();

  const user = await User.findOne({ email }).select("+password +refreshToken");
  if (!user) {
    throw new ApiError(401, "Invalid credentials");
  }

  const passwordMatches = await user.comparePassword(password);
  if (!passwordMatches) {
    throw new ApiError(401, "Invalid credentials");
  }

  if (!user.isActive) {
    throw new ApiError(403, "Account deactivated");
  }

  if (!user.isVerified) {
    throw new ApiError(403, "Email verification required");
  }

  user.lastLogin = new Date();

  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  user.refreshToken = refreshToken;
  await user.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        user: sanitizeUser(user),
        accessToken,
        refreshToken,
      },
      "Login successful",
    ),
  );
});

export const adminLogin = asyncHandler(async (req, res) => {
  const { password } = req.body;
  const email = req.body.email?.trim().toLowerCase();

  const user = await User.findOne({ email }).select("+password +refreshToken");
  if (!user) {
    throw new ApiError(401, "Invalid credentials");
  }

  const passwordMatches = await user.comparePassword(password);
  if (!passwordMatches) {
    throw new ApiError(401, "Invalid credentials");
  }

  if (normalizeRole(user.role, "employee") !== "admin") {
    throw new ApiError(403, "Only admin can login here");
  }

  if (!user.isActive) {
    throw new ApiError(403, "Account deactivated");
  }

  if (!user.isVerified) {
    throw new ApiError(403, "Email verification required");
  }

  user.lastLogin = new Date();

  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  user.refreshToken = refreshToken;
  await user.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        token: accessToken,
        role: "admin",
        user: sanitizeUser(user),
        accessToken,
        refreshToken,
      },
      "Admin login successful",
    ),
  );
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const email = req.body.email?.trim().toLowerCase();

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({
      success: false,
      message: "Email not found",
    });
  }

  const code = generateVerificationCode();
  const expiresAt = new Date(Date.now() + RESET_CODE_WINDOW_MS);

  await VerificationCode.deleteMany({
    email: user.email,
    $or: [{ purpose: "reset-password" }, { type: "password_reset" }],
  });

  const verification = new VerificationCode({
    purpose: "reset-password",
    type: "password_reset",
    email: user.email,
    verificationMethod: "email",
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    gender: user.gender,
    expiresAt,
    attempts: 0,
  });

  await verification.setCode(code);
  await verification.save();

  try {
    await sendPasswordResetCode(user.email, code, user.firstName);
    void notifService.create(user._id, user.tenantId, {
      type: "info",
      title: "Password reset requested",
      message: "A password reset verification code was sent to your email.",
      source: "system",
      actionUrl: "/forgot-password",
      metadata: { email: user.email },
    }).catch((notificationError) => {
      console.error("[AUTH] Failed to create password reset notification:", notificationError.message);
    });
  } catch (error) {
    await VerificationCode.deleteOne({ _id: verification._id });
    console.error("[AUTH] Failed to send password reset email:", {
      email: user.email,
      message: error.message,
      code: error.code,
      response: error.response,
      responseCode: error.responseCode,
      attemptedModes: error.attemptedModes,
    });
    const sslMessage = String(error.message || "").toLowerCase();
    if (sslMessage.includes("ssl") || sslMessage.includes("tls")) {
      throw new ApiError(
        500,
        "Gmail SMTP handshake failed. Verify EMAIL_USER, use a Gmail App Password, and retry from a network that allows smtp.gmail.com.",
      );
    }
    throw new ApiError(500, "Failed to send reset code");
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        email: user.email,
        expiresAt,
      },
      "Reset code sent",
    ),
  );
});

export const verifyResetCode = asyncHandler(async (req, res) => {
  const code = req.body.code;
  const email = req.body.email?.trim().toLowerCase();

  const verification = await VerificationCode.findOne({
    email,
    purpose: "reset-password",
    type: "password_reset",
    consumedAt: null,
  }).select("+codeHash");

  if (!verification) {
    throw new ApiError(400, "Invalid or expired code");
  }

  if (verification.expiresAt.getTime() < Date.now()) {
    await VerificationCode.deleteOne({ _id: verification._id });
    throw new ApiError(400, "Invalid or expired code");
  }

  if (verification.attempts >= MAX_RESET_CODE_ATTEMPTS) {
    await VerificationCode.deleteOne({ _id: verification._id });
    throw new ApiError(429, "Too many invalid attempts. Request a new code.");
  }

  const isMatch = await verification.compareCode(code);
  if (!isMatch) {
    verification.attempts += 1;
    await verification.save();

    if (verification.attempts >= MAX_RESET_CODE_ATTEMPTS) {
      await VerificationCode.deleteOne({ _id: verification._id });
      throw new ApiError(429, "Too many invalid attempts. Request a new code.");
    }

    throw new ApiError(400, "Invalid or expired code");
  }

  verification.verifiedAt = new Date();
  verification.expiresAt = new Date(Date.now() + RESET_CODE_WINDOW_MS);
  await verification.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        email: verification.email,
        verified: true,
      },
      "Reset code verified",
    ),
  );
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { password } = req.body;
  const email = req.body.email?.trim().toLowerCase();

  const verification = await VerificationCode.findOne({
    email,
    purpose: "reset-password",
    type: "password_reset",
    consumedAt: null,
  });

  if (!verification || !verification.verifiedAt) {
    throw new ApiError(400, "Password reset not authorized");
  }

  if (verification.expiresAt.getTime() < Date.now()) {
    await VerificationCode.deleteOne({ _id: verification._id });
    throw new ApiError(400, "Password reset session expired");
  }

  const user = await User.findOne({ email }).select("+password +refreshToken");
  if (!user) {
    await VerificationCode.deleteOne({ _id: verification._id });
    throw new ApiError(404, "Email not found");
  }

  user.password = password;
  user.refreshToken = null;
  await user.save();

  await VerificationCode.deleteOne({ _id: verification._id });
  void notifService.create(user._id, user.tenantId, {
    type: "info",
    title: "Password reset successful",
    message: "Your password was updated successfully.",
    source: "system",
    actionUrl: "/login",
    metadata: { email: user.email },
  }).catch((notificationError) => {
    console.error("[AUTH] Failed to create password reset success notification:", notificationError.message);
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {},
      "Password reset successful",
    ),
  );
});

export const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken: token } = req.body;

  if (!token) {
    throw new ApiError(400, "Refresh token required");
  }

  let decoded;

  try {
    const jwt = (await import("jsonwebtoken")).default;
    decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch {
    throw new ApiError(401, "Invalid or expired refresh token");
  }

  const user = await User.findOne({ _id: decoded.id, refreshToken: token });
  if (!user) {
    throw new ApiError(401, "Invalid refresh token");
  }

  const accessToken = user.generateAccessToken();

  return res.status(200).json(
    new ApiResponse(
      200,
      { accessToken },
      "Token refreshed",
    ),
  );
});

export const logout = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { refreshToken: null });

  return res.status(200).json(
    new ApiResponse(200, {}, "Logged out"),
  );
});

export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("-password -refreshToken");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      { user: sanitizeUser(user) },
      "Current user fetched",
    ),
  );
});

export const testEmail = asyncHandler(async (req, res) => {
  const to = req.query.email || process.env.EMAIL_USER;
  const code = "123456";

  if (!to) {
    throw new ApiError(400, "Test email recipient is required");
  }

  try {
    await verifyEmailTransport();
    const result = await sendEmailVerificationCode(to, code, "Test User");

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          recipient: to,
          messageId: result.messageId,
          accepted: result.accepted,
          rejected: result.rejected,
        },
        "Test email sent successfully",
      ),
    );
  } catch (error) {
    console.error("[AUTH] Test email failed:", {
      email: to,
      message: error.message,
      code: error.code,
      response: error.response,
      responseCode: error.responseCode,
      attemptedModes: error.attemptedModes,
    });
    const sslMessage = String(error.message || "").toLowerCase();
    if (sslMessage.includes("ssl") || sslMessage.includes("tls")) {
      throw new ApiError(
        500,
        "Gmail SMTP handshake failed. Verify EMAIL_USER, use a Gmail App Password, and retry from a network that allows smtp.gmail.com.",
      );
    }
    throw new ApiError(500, "Failed to send test email");
  }
});
