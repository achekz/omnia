import User from "../models/User.js";
import EmailVerificationCode from "../models/EmailVerificationCode.js";
import { sendEmailVerificationCode } from "../services/emailService.js";
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
  const { firstName, lastName, email, role, gender } = req.body;

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
  await sendEmailVerificationCode(email, code, firstName);

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
  const { email, code } = req.body;

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
  const { firstName, lastName, email, role, gender, password } = req.body;

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

  const user = await User.create({
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

  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  user.refreshToken = refreshToken;
  await user.save();
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
  const { email, password } = req.body;

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
