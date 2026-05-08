// Role du fichier: prepare ou repare des donnees initiales de demonstration.
import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import User from "../models/User.js";
import VerificationCode from "../models/VerificationCode.js";
import EmailVerificationCode from "../models/EmailVerificationCode.js";
import Rule from "../models/Rule.js";
import { getAllowedRoles, normalizeProfileType, normalizeRole } from "../utils/roleNormalization.js";

dotenv.config();

const MODELS = [
  { name: "users", model: User },
  { name: "verification codes", model: VerificationCode },
  { name: "email verification codes", model: EmailVerificationCode },
];

async function normalizeModelRoles({ name, model }) {
  const docs = await model.find({
    $or: [
      { role: { $exists: true } },
      { profileType: { $exists: true } },
    ],
  }).select("+password +codeHash role profileType");

  let updated = 0;

  for (const doc of docs) {
    const rawRole = String(doc.role || doc.profileType || "").trim().toLowerCase();
    const role = ["student", "etudiant", "étudiant"].includes(rawRole)
      ? "stagiaire"
      : normalizeRole(doc.role || doc.profileType, "employee");
    const profileType = normalizeProfileType(doc.profileType || role, role);

    if (doc.role !== role || (doc.profileType !== undefined && doc.profileType !== profileType)) {
      doc.role = role;
      if (doc.profileType !== undefined) {
        doc.profileType = profileType;
      }
      await doc.save();
      updated += 1;
    }
  }

  console.log(`${name}: ${updated} role document(s) normalized.`);
}

async function normalizeRules() {
  const rules = await Rule.find({});
  let updated = 0;
  let removed = 0;

  for (const rule of rules) {
    const hasAcademicCondition = (rule.conditions || []).some((condition) =>
      ["stagiaire.examDueDays", "student.examDueDays"].includes(condition.metric),
    );

    if (rule.resource === "student" || hasAcademicCondition || rule.name === "Exam revision reminder") {
      await rule.deleteOne();
      removed += 1;
      continue;
    }

    const nextResource = rule.resource === "student" ? "stagiaire" : rule.resource;
    const nextRoles = (rule.roles || []).map((role) => normalizeRole(role, role));
    const nextConditions = (rule.conditions || []).map((condition) => {
      const conditionObject = condition.toObject?.() || condition;
      return { ...conditionObject };
    });
    const changed =
      rule.resource !== nextResource ||
      JSON.stringify(rule.roles || []) !== JSON.stringify(nextRoles) ||
      JSON.stringify((rule.conditions || []).map((condition) => condition.metric)) !==
        JSON.stringify(nextConditions.map((condition) => condition.metric));

    if (changed) {
      rule.resource = nextResource;
      rule.roles = nextRoles;
      rule.conditions = nextConditions;
      await rule.save();
      updated += 1;
    }
  }

  console.log(`rules: ${updated} automation rule(s) normalized, ${removed} academic rule(s) removed.`);
}

async function migrateRoles() {
  try {
    const result = await connectDB();

    if (!result.connected) {
      throw result.error || new Error("MongoDB connection failed");
    }

    for (const item of MODELS) {
      await normalizeModelRoles(item);
    }
    await normalizeRules();

    const invalidRoles = await User.distinct("role", { role: { $nin: getAllowedRoles() } });
    const invalidProfiles = await User.distinct("profileType", { profileType: { $nin: getAllowedRoles() } });

    if (invalidRoles.length || invalidProfiles.length) {
      throw new Error(`Invalid roles remain. roles=${invalidRoles.join(",")} profileTypes=${invalidProfiles.join(",")}`);
    }

    console.log("Roles migrated to canonical values: admin, employee, stagiaire, comptable.");
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("Role migration failed:", error.message);
    await mongoose.connection.close().catch(() => {});
    process.exit(1);
  }
}

migrateRoles();
