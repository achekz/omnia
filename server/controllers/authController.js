import User from "../models/User.js";
import EmailVerificationCode from "../models/EmailVerificationCode.js";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import {
  sendEmailVerificationCode,
  sendPasswordResetCode,
  verifyEmailTransport,
} from "../services/emailService.js";
import { ApiError, ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const VERIFICATION_WINDOW_MS = 5 * 60 * 1000;

function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function sanitizeUser(user) {
  return {
    _id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    name: user.name,
    email: user.email,
    role: user.role,
    profileType: user.profileType,
    gender: user.gender,
    isVerified: user.isVerified,
    avatar: user.avatar,
    tenantId: user.tenantId,
    preferences: user.preferences,
    createdAt: user.createdAt,
  };
}

export const sendCode = asyncHandler(async (req, res) => {
  const { firstName, lastName, role, gender } = req.body;
  const email = req.body.email?.trim().toLowerCase();

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(409, "Email already registered");
  }

  const code = generateVerificationCode();
  const expiresAt = new Date(Date.now() + VERIFICATION_WINDOW_MS);

  await EmailVerificationCode.deleteMany({ email });

  const verification = new EmailVerificationCode({
    firstName,
    lastName,
    email,
    role,
    gender,
    expiresAt,
  });

  await verification.setCode(code);
  await verification.save();

  try {
    await sendEmailVerificationCode(email, code, firstName);
  } catch (error) {
    console.error("[AUTH] Failed to send verification code email:", {
      email,
      message: error.message,
      code: error.code,
      response: error.response,
      responseCode: error.responseCode,
    });
    await EmailVerificationCode.deleteOne({ _id: verification._id });
    throw new ApiError(500, "Failed to send verification code");
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        email,
        expiresAt,
      },
      "Verification code sent",
    ),
  );
});

export const verifyCode = asyncHandler(async (req, res) => {
  const code = req.body.code;
  const email = req.body.email?.trim().toLowerCase();

  const verification = await EmailVerificationCode.findOne({ email }).select("+codeHash");

  if (!verification) {
    throw new ApiError(404, "Verification request not found");
  }

  if (verification.expiresAt.getTime() < Date.now()) {
    await EmailVerificationCode.deleteOne({ _id: verification._id });
    throw new ApiError(400, "Verification code expired");
  }

  const isMatch = await verification.compareCode(code);
  if (!isMatch) {
    throw new ApiError(400, "Invalid verification code");
  }

  verification.verifiedAt = new Date();
  await verification.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        email,
        verified: true,
      },
      "Email verified successfully",
    ),
  );
});

export const register = asyncHandler(async (req, res) => {
  const { firstName, lastName, role, gender, password } = req.body;
  const email = req.body.email?.trim().toLowerCase();

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

  const verification = await EmailVerificationCode.findOne({ email });
  if (!verification || !verification.verifiedAt) {
    throw new ApiError(400, "Email must be verified before registration");
  }

  if (verification.expiresAt.getTime() < Date.now()) {
    await EmailVerificationCode.deleteOne({ _id: verification._id });
    throw new ApiError(400, "Verification session expired");
  }

  const payloadMatches =
    verification.firstName === firstName &&
    verification.lastName === lastName &&
    verification.role === role &&
    verification.gender === gender;

  if (!payloadMatches) {
    throw new ApiError(400, "Registration details do not match the verified identity");
  }

  const user = new User({
    firstName,
    lastName,
    email,
    password,
    role,
    profileType: role,
    gender,
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

  await EmailVerificationCode.deleteMany({ email });

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

export const forgotPassword = asyncHandler(async (req, res) => {
  const email = req.body.email?.trim().toLowerCase();

  const user = await User.findOne({ email }).select("+resetCode +resetCodeExpire +resetCodeVerified");
  if (!user) {
    throw new ApiError(404, "No account found with this email");
  }

  const code = generateVerificationCode();
  const codeHash = await bcrypt.hash(code, 10);

  user.resetCode = codeHash;
  user.resetCodeExpire = new Date(Date.now() + VERIFICATION_WINDOW_MS);
  user.resetCodeVerified = false;
  await user.save();

  try {
    await sendPasswordResetCode(user.email, code, user.firstName);
  } catch (error) {
    console.error("[AUTH] Failed to send password reset email:", {
      email: user.email,
      message: error.message,
      code: error.code,
      response: error.response,
      responseCode: error.responseCode,
    });
    throw new ApiError(500, "Failed to send reset code");
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        email: user.email,
      },
      "Reset code sent",
    ),
  );
});

export const verifyResetCode = asyncHandler(async (req, res) => {
  const code = req.body.code;
  const email = req.body.email?.trim().toLowerCase();

  const user = await User.findOne({ email }).select("+resetCode +resetCodeExpire +resetCodeVerified");
  if (!user || !user.resetCode || !user.resetCodeExpire) {
    throw new ApiError(400, "Invalid or expired code");
  }

  if (user.resetCodeExpire.getTime() < Date.now()) {
    user.resetCode = undefined;
    user.resetCodeExpire = undefined;
    user.resetCodeVerified = false;
    await user.save();
    throw new ApiError(400, "Invalid or expired code");
  }

  const isMatch = await bcrypt.compare(code, user.resetCode);
  if (!isMatch) {
    throw new ApiError(400, "Invalid or expired code");
  }

  user.resetCodeVerified = true;
  user.resetCodeExpire = new Date(Date.now() + VERIFICATION_WINDOW_MS);
  await user.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        email: user.email,
        verified: true,
      },
      "Reset code verified",
    ),
  );
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { password } = req.body;
  const email = req.body.email?.trim().toLowerCase();

  const user = await User.findOne({ email }).select("+password +resetCode +resetCodeExpire +resetCodeVerified");
  if (!user || !user.resetCode || !user.resetCodeExpire || !user.resetCodeVerified) {
    throw new ApiError(400, "Password reset not authorized");
  }

  if (user.resetCodeExpire.getTime() < Date.now()) {
    user.resetCode = undefined;
    user.resetCodeExpire = undefined;
    user.resetCodeVerified = false;
    await user.save();
    throw new ApiError(400, "Password reset session expired");
  }

  user.password = password;
  user.resetCode = undefined;
  user.resetCodeExpire = undefined;
  user.resetCodeVerified = false;
  await user.save();

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
    });
    throw new ApiError(500, "Failed to send test email");
  }
});
