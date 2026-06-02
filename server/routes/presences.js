// Role du fichier: definit les routes API et relie les endpoints aux controles backend.
import express from "express";
import attendanceController from "../controllers/attendanceController.js";
import presenceController from "../controllers/presenceController.js";
import { protect } from "../middleware/auth.js";
import { tenantIsolation } from "../middleware/tenant.js";
import { authorize } from "../middleware/rbac.js";

const router = express.Router();

router.use(protect, tenantIsolation);

router.get("/calendar", authorize("admin"), presenceController.getPresenceCalendar);
router.get("/:date", authorize("admin"), presenceController.getPresenceByDate);
router.post("/check-in", presenceController.checkIn);
router.post("/check-out", (req, res, next) => {
  req.body = { ...req.body, action: "check-out" };
  return attendanceController.confirmAttendance(req, res, next);
});

export default router;
