import express from 'express';
import { protect } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/rbac.js';
import { getUsers } from "../controllers/userController.js";

const router = express.Router();

// 🔥 admin only
router.get("/", protect, authorizeRoles("admin"), getUsers);

export default router;