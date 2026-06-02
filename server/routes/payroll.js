// Role du fichier: definit les routes API de paie cote backend.
import express from "express";
import {
  generatePayrollRun,
  getPayrollRun,
  listPayrollRuns,
  previewPayrollRun,
  updatePayrollStatus,
} from "../controllers/payrollController.js";
import { protect } from "../middleware/auth.js";
import { authorize } from "../middleware/roleMiddleware.js";
import { tenantIsolation } from "../middleware/tenant.js";

const router = express.Router();

router.use(protect, tenantIsolation, authorize("admin", "comptable"));

router.get("/", listPayrollRuns);
router.post("/preview", previewPayrollRun);
router.post("/generate", generatePayrollRun);
router.get("/:id", getPayrollRun);
router.patch("/:id/status", updatePayrollStatus);

export default router;
