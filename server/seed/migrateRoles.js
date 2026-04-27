import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import User from "../models/User.js";
import VerificationCode from "../models/VerificationCode.js";

dotenv.config();

async function migrateRoles() {
  try {
    const result = await connectDB();

    if (!result.connected) {
      throw result.error || new Error("MongoDB connection failed");
    }

    const userResult = await User.updateMany(
      {
        $or: [
          { role: "accountant" },
          { role: "intern" },
          { profileType: "accountant" },
          { profileType: "intern" },
        ],
      },
      [
        {
          $set: {
            role: {
              $switch: {
                branches: [
                  { case: { $eq: ["$role", "accountant"] }, then: "comptable" },
                  { case: { $eq: ["$role", "intern"] }, then: "stagiaire" },
                ],
                default: "$role",
              },
            },
            profileType: {
              $switch: {
                branches: [
                  { case: { $eq: ["$profileType", "accountant"] }, then: "comptable" },
                  { case: { $eq: ["$profileType", "intern"] }, then: "employee" },
                ],
                default: "$profileType",
              },
            },
          },
        },
      ],
    );

    const verificationResult = await VerificationCode.updateMany(
      { role: { $in: ["accountant", "intern"] } },
      [
        {
          $set: {
            role: {
              $switch: {
                branches: [
                  { case: { $eq: ["$role", "accountant"] }, then: "comptable" },
                  { case: { $eq: ["$role", "intern"] }, then: "stagiaire" },
                ],
                default: "$role",
              },
            },
          },
        },
      ],
    );

    console.log(`✅ Roles migrated. Users updated: ${userResult.modifiedCount}, verification codes updated: ${verificationResult.modifiedCount}`);
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Role migration failed:", error.message);
    await mongoose.connection.close().catch(() => {});
    process.exit(1);
  }
}

migrateRoles();
