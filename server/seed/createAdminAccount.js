import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import User from "../models/User.js";
import Organization from "../models/Organization.js";

dotenv.config();

const ADMIN_EMAIL = "admin@gmail.com";
const ADMIN_PASSWORD = "Admin123@";

async function createAdminAccount() {
  try {
    const dbResult = await connectDB();

    if (!dbResult.connected) {
      throw dbResult.error || new Error("MongoDB connection failed");
    }

    console.log("🔧 Removing old admin accounts...");

    const oldAdmins = await User.find({
      $or: [
        { email: ADMIN_EMAIL },
        { role: { $in: ["admin", "ADMIN"] } },
        { profileType: { $in: ["admin", "ADMIN"] } },
      ],
    }).select("_id email role profileType");

    if (oldAdmins.length > 0) {
      console.log(`🗑️ Found ${oldAdmins.length} old admin account(s). Deleting them...`);
      await User.deleteMany({
        _id: { $in: oldAdmins.map((user) => user._id) },
      });
    } else {
      console.log("ℹ️ No existing admin accounts found.");
    }

    const fallbackTenant = await Organization.findOne({}).select("_id name");

    const adminUser = new User({
      firstName: "Admin",
      lastName: "Omni",
      email: ADMIN_EMAIL,
      phoneNumber: "+21611111111",
      city: "tunisia",
      password: ADMIN_PASSWORD,
      role: "admin",
      profileType: "admin",
      verificationMethod: "email",
      gender: "female",
      isVerified: true,
      isActive: true,
      tenantId: fallbackTenant?._id,
    });

    await adminUser.save();

    console.log("✅ Admin account created successfully.");
    console.log(`📧 Email: ${ADMIN_EMAIL}`);
    console.log(`🔑 Password: ${ADMIN_PASSWORD}`);
    if (fallbackTenant) {
      console.log(`🏢 Tenant linked: ${fallbackTenant.name}`);
    } else {
      console.log("ℹ️ No tenant found. Admin was created without tenantId.");
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Failed to create admin account:", error.message);
    await mongoose.connection.close().catch(() => {});
    process.exit(1);
  }
}

createAdminAccount();
