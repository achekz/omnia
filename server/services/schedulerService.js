import { refreshRecommendationsForScope } from "./recommendationService.js";
import { ruleEngine } from "./ruleEngine.js";

let schedulerHandle = null;
let ruleSchedulerHandle = null;

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
    ruleSchedulerHandle = cron.schedule("*/15 * * * *", () => {
      void ruleEngine.run({ trigger: "scheduled" });
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

    if (!ruleSchedulerHandle) {
      ruleSchedulerHandle = setInterval(() => {
        void ruleEngine.run({ trigger: "scheduled" });
      }, 15 * 60 * 1000);
      if (typeof ruleSchedulerHandle.unref === "function") {
        ruleSchedulerHandle.unref();
      }
    }

    return schedulerHandle;
  }
}
