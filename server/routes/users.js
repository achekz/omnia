import express from 'express';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { 
  getUsers, 
  getProfile, 
  updateProfile,
  sendEmailVerificationCode,
  verifyEmailChange,
  updateNotificationPreferences,
  changePassword
} from "../controllers/userController.js";

const router = express.Router();

// profile
router.get("/profile", protect, getProfile);
router.put("/profile", protect, updateProfile);

// Email management
router.post("/send-email-verification", protect, sendEmailVerificationCode);
router.post("/verify-email-change", protect, verifyEmailChange);

// Notification preferences
router.put("/notification-preferences", protect, updateNotificationPreferences);

// Password management
router.post("/change-password", protect, changePassword);

// 🔥 admin only
router.get("/", protect, authorize("admin"), getUsers);

export default router;