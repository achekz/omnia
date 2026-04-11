import express from 'express';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import {
  validateUpdateProfile,
  validateEmailVerification,
  handleValidationErrors
} from '../utils/validators.js';
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

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     tags: [Users]
 *     summary: Get current user profile
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User profile data
 */
router.get("/profile", protect, getProfile);

/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     tags: [Users]
 *     summary: Update user profile
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               avatar:
 *                 type: string
 *               theme:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated
 */
router.put("/profile", protect, validateUpdateProfile, handleValidationErrors, updateProfile);

/**
 * @swagger
 * /api/users/send-email-verification:
 *   post:
 *     tags: [Users]
 *     summary: Send email verification code
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Verification code sent
 */
router.post("/send-email-verification", protect, validateEmailVerification, handleValidationErrors, sendEmailVerificationCode);

/**
 * @swagger
 * /api/users/verify-email-change:
 *   post:
 *     tags: [Users]
 *     summary: Verify email change with code
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               newEmail:
 *                 type: string
 *                 format: email
 *               code:
 *                 type: string
 *     responses:
 *       200:
 *         description: Email verified and updated
 */
router.post("/verify-email-change", protect, verifyEmailChange);

/**
 * @swagger
 * /api/users/notification-preferences:
 *   put:
 *     tags: [Users]
 *     summary: Update notification preferences
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               emailNotifications:
 *                 type: boolean
 *               pushNotifications:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Preferences updated
 */
router.put("/notification-preferences", protect, updateNotificationPreferences);

/**
 * @swagger
 * /api/users/change-password:
 *   post:
 *     tags: [Users]
 *     summary: Change user password
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed
 */
router.post("/change-password", protect, changePassword);

/**
 * @swagger
 * /api/users:
 *   get:
 *     tags: [Users]
 *     summary: Get all users (admin only)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 */
router.get("/", protect, authorize("admin"), getUsers);

export default router;