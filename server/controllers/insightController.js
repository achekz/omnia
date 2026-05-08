// Role du fichier: contient la logique backend des requetes et reponses API.
import { getLatestInsightSnapshot, generateInsightSnapshot } from "../services/insightService.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Role: Recupere les donnees necessaires.
export const getOverview = asyncHandler(async (req, res) => {
  const snapshot = await getLatestInsightSnapshot({ tenantId: req.tenantId });
  res.json(new ApiResponse(200, { snapshot }, "AI insight snapshot retrieved"));
});

// Role: Decrit la logique generateOverview.
export const generateOverview = asyncHandler(async (req, res) => {
  const snapshot = await generateInsightSnapshot({
    tenantId: req.tenantId,
    generatedBy: req.body?.trigger || "manual-api",
    role: req.user?.role || "all",
  });

  res.status(201).json(new ApiResponse(201, { snapshot }, "AI insight snapshot generated"));
});

export default {
  getOverview,
  generateOverview,
};
