import express from "express";
import attendanceController from "../controllers/attendanceController.js";
import { protect } from "../middleware/auth.js";
import { authorize } from "../middleware/roleMiddleware.js";
import { tenantIsolation } from "../middleware/tenant.js";

const router = express.Router();

router.use(protect, tenantIsolation);

router.get("/me", attendanceController.getMyAttendance);
router.post("/send-code", attendanceController.sendAttendanceCode);
router.post("/confirm", attendanceController.confirmAttendance);
router.get("/all", authorize("admin"), attendanceController.getAllAttendance);

export default router;
