import express from "express";
import {
  forgotPassword,
  getMe,
  login,
  logout,
  refreshToken,
  register,
  resetPassword,
  sendCode,
  verifyResetCode,
  verifyCode,
} from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";
import {
  validateForgotPassword,
  handleValidationErrors,
  validateLogin,
  validateRegister,
  validateResetPassword,
  validateSendCode,
  validateVerifyResetCode,
  validateVerifyCode,
} from "../utils/validators.js";

const router = express.Router();

router.post("/send-code", validateSendCode, handleValidationErrors, sendCode);
router.post("/verify-code", validateVerifyCode, handleValidationErrors, verifyCode);
router.post("/register", validateRegister, handleValidationErrors, register);
router.post("/login", validateLogin, handleValidationErrors, login);
router.post("/forgot-password", validateForgotPassword, handleValidationErrors, forgotPassword);
router.post("/verify-reset-code", validateVerifyResetCode, handleValidationErrors, verifyResetCode);
router.post("/reset-password", validateResetPassword, handleValidationErrors, resetPassword);
router.post("/refresh-token", refreshToken);
router.post("/logout", protect, logout);
router.get("/me", protect, getMe);

export default router;
