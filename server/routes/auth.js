import express from "express";
import {
  getMe,
  login,
  logout,
  refreshToken,
  register,
  sendCode,
  verifyCode,
} from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";
import {
  handleValidationErrors,
  validateLogin,
  validateRegister,
  validateSendCode,
  validateVerifyCode,
} from "../utils/validators.js";

const router = express.Router();

router.post("/send-code", validateSendCode, handleValidationErrors, sendCode);
router.post("/verify-code", validateVerifyCode, handleValidationErrors, verifyCode);
router.post("/register", validateRegister, handleValidationErrors, register);
router.post("/login", validateLogin, handleValidationErrors, login);
router.post("/refresh-token", refreshToken);
router.post("/logout", protect, logout);
router.get("/me", protect, getMe);

export default router;
