import { generateWeeklyEffectivenessRecommendation } from "./recommendationService.js";
import { ruleEngine } from "./ruleEngine.js";
import { generateInsightSnapshot } from "./insightService.js";

let schedulerHandle = null;
let ruleSchedulerHandle = null;
let insightSchedulerHandle = null;

// Role: Lance un traitement metier ou IA.
async function runRecommendationJob() {
  try {
    console.log("[CRON] Running Saturday 10:00 weekly effectiveness recommendation job...");
    await generateWeeklyEffectivenessRecommendation({ trigger: "weekly-saturday-10" });
    console.log("[CRON] Weekly recommendation job completed.");
  } catch (error) {
    console.error("[CRON] Weekly recommendation job failed:", error.message);
  }
}

// Role: Lance un traitement metier ou IA.
async function runInsightJob() {
  try {
    console.log("[CRON] Running daily AI insight snapshot...");
    await generateInsightSnapshot({ generatedBy: "daily-cron" });
    console.log("[CRON] Daily AI insight snapshot completed.");
  } catch (error) {
    console.error("[CRON] Daily AI insight snapshot failed:", error.message);
  }
}

// Role: Decrit la logique startRecommendationScheduler.
export async function startRecommendationScheduler() {
  if (schedulerHandle) {
    return schedulerHandle;
  }

  try {
    const cronModule = await import("node-cron");
    const cron = cronModule.default || cronModule;
    schedulerHandle = cron.schedule(
      "0 10 * * 6",
      () => {
        void runRecommendationJob();
      },
      { timezone: process.env.CRON_TIMEZONE || "Africa/Tunis" },
    );
    ruleSchedulerHandle = cron.schedule("*/15 * * * *", () => {
      void ruleEngine.run({ trigger: "scheduled" });
    });
    insightSchedulerHandle = cron.schedule("10 8 * * *", () => {
      void runInsightJob();
    });
    console.log("[CRON] node-cron scheduler started for recommendations, rules, and AI insights.");
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

    if (!insightSchedulerHandle) {
      insightSchedulerHandle = setInterval(() => {
        void runInsightJob();
      }, 24 * 60 * 60 * 1000);
      if (typeof insightSchedulerHandle.unref === "function") {
        insightSchedulerHandle.unref();
      }
    }

    return schedulerHandle;
  }
}
