import { refreshRecommendationsForScope } from "./recommendationService.js";

let schedulerHandle = null;

async function runRecommendationJob() {
  try {
    console.log("[CRON] Running weekly recommendation job...");
    await refreshRecommendationsForScope({ trigger: "weekly-cron" });
    console.log("[CRON] Weekly recommendation job completed.");
  } catch (error) {
    console.error("[CRON] Weekly recommendation job failed:", error.message);
  }
}

export async function startRecommendationScheduler() {
  if (schedulerHandle) {
    return schedulerHandle;
  }

  try {
    const cronModule = await import("node-cron");
    const cron = cronModule.default || cronModule;
    schedulerHandle = cron.schedule("0 8 * * 1", () => {
      void runRecommendationJob();
    });
    console.log("[CRON] node-cron scheduler started for weekly recommendations.");
    return schedulerHandle;
  } catch (error) {
    console.warn("[CRON] node-cron not available, using 7-day interval fallback:", error.message);
    schedulerHandle = setInterval(() => {
      void runRecommendationJob();
    }, 7 * 24 * 60 * 60 * 1000);

    if (typeof schedulerHandle.unref === "function") {
      schedulerHandle.unref();
    }

    return schedulerHandle;
  }
}
