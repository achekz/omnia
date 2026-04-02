import express from 'express';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { getUsers, getProfile, updateProfile } from "../controllers/userController.js";

const router = express.Router();

// profile
router.get("/profile", protect, getProfile);
router.put("/profile", protect, updateProfile);

// 🔥 admin only
router.get("/", protect, authorize("admin"), getUsers);

export default router;