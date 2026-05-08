// Role du fichier: definit les routes API et relie les endpoints aux controles backend.
import express from "express";
import insightController from "../controllers/insightController.js";
import { protect } from "../middleware/auth.js";
import { tenantIsolation } from "../middleware/tenant.js";
import { authorize } from "../middleware/rbac.js";

const router = express.Router();

router.use(protect, tenantIsolation);

router.get("/overview", authorize("admin", "comptable", "employee", "stagiaire"), insightController.getOverview);
router.post("/generate", authorize("admin"), insightController.generateOverview);

export default router;
