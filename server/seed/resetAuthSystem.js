import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import Attendance from "../models/Attendance.js";
import User from "../models/User.js";

dotenv.config();

function requireEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is missing`);
  }

  return value;
}

function createLogger(silent) {
  return {
    log: (...args) => {
      if (!silent) console.log(...args);
    },
    error: (...args) => {
      if (!silent) console.error(...args);
    },
  };
}

function getRecoveryAccounts() {
  return [
    {
      email: "ranyme13@gmail.com",
      firstName: "Ranyme",
      lastName: "Stagiaire",
      password: requireEnv("RANYME_PASSWORD"),
      phoneNumber: "+21620000013",
      role: "stagiaire",
      gender: "female",
    },
    {
      email: "najetkhbrahem1979@gmail.com",
      firstName: "Najet",
      lastName: "Khbrahem",
      password: requireEnv("NAJET_PASSWORD"),
      phoneNumber: "+21620001979",
      role: "stagiaire",
      gender: "female",
    },
    {
      email: "chaymagaabel777@gmail.com",
      firstName: "Chayma",
      lastName: "Gaabel",
      password: requireEnv("COMPTABLE_PASSWORD"),
      phoneNumber: "+21620000777",
      role: "comptable",
      gender: "female",
    },
  ];
}

function sameKey(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export async function repairUserIndexes({ silent = false } = {}) {
  const logger = createLogger(silent);
  const indexes = await User.collection.indexes();

  for (const index of indexes) {
    if (!index.unique || index.name === "_id_") {
      continue;
    }

    if (sameKey(index.key, { email: 1 })) {
      continue;
    }

    await User.collection.dropIndex(index.name);
    logger.log(`Dropped invalid unique index: ${index.name}`);
  }

  await User.collection.createIndex({ email: 1 }, { unique: true, name: "email_1" });
  await User.collection.createIndex({ role: 1 }, { name: "role_1" });
  await User.collection.createIndex({ profileType: 1 }, { name: "profileType_1" });
}

export async function enforceSingleAdmin({ silent = false } = {}) {
  const logger = createLogger(silent);
  const admins = await User.find({ role: "admin" }).sort({ createdAt: 1, _id: 1 }).select("_id email");

  if (admins.length <= 1) {
    return;
  }

  const [, ...extraAdmins] = admins;
  await User.updateMany(
    { _id: { $in: extraAdmins.map((admin) => admin._id) } },
    { $set: { role: "employee", profileType: "employee", refreshToken: null } },
  );

  logger.log(`Demoted ${extraAdmins.length} extra admin account(s).`);
}

function buildSnapshot(user) {
  const firstName = String(user.firstName || "").trim();
  const lastName = String(user.lastName || "").trim();

  return {
    name: String(user.name || `${firstName} ${lastName}`.trim()).trim(),
    firstName,
    lastName,
    email: String(user.email || "").trim().toLowerCase(),
    role: String(user.role || user.profileType || "").trim().toLowerCase(),
    profileType: String(user.profileType || user.role || "").trim().toLowerCase(),
  };
}

export async function recreateAccount(account) {
  const email = account.email.trim().toLowerCase();

  let user = await User.findOne({ email }).select("+password +refreshToken");

  if (!user) {
    user = new User({ email });
  }

  user.firstName = account.firstName;
  user.lastName = account.lastName;
  user.phoneNumber = account.phoneNumber;
  user.city = "tunisia";
  user.password = account.password;
  user.role = account.role;
  user.profileType = account.role;
  user.verificationMethod = "email";
  user.gender = account.gender;
  user.isVerified = true;
  user.isActive = true;
  user.refreshToken = null;
  await user.save();

  const savedUser = await User.findById(user._id).select("+password email role profileType isActive isVerified");
  const passwordMatches = await savedUser.comparePassword(account.password);
  const accessToken = savedUser.generateAccessToken();
  const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);

  await User.updateOne(
    { _id: savedUser._id },
    { $set: { refreshToken: savedUser.generateRefreshToken() } },
  );

  return {
    email: savedUser.email,
    role: savedUser.role,
    profileType: savedUser.profileType,
    passwordMatches,
    tokenValid: decoded.id === String(savedUser._id),
  };
}

export async function repairAttendanceRecords({ silent = false } = {}) {
  const logger = createLogger(silent);
  const users = await User.find({}).select("_id name firstName lastName email role profileType").lean();
  const userIds = new Set(users.map((user) => String(user._id)));
  const usersByEmail = new Map(users.map((user) => [String(user.email).toLowerCase(), user]));
  const records = await Attendance.find({}).populate("userId", "name firstName lastName email role profileType");
  const repairCandidates = [
    usersByEmail.get("najetkhbrahem1979@gmail.com"),
    usersByEmail.get("chaymagaabel777@gmail.com"),
    usersByEmail.get("ranyme13@gmail.com"),
  ].filter(Boolean);
  let repaired = 0;

  for (const record of records) {
    const populatedUser = record.userId && typeof record.userId === "object" && record.userId.email ? record.userId : null;
    const rawUserId = populatedUser?._id || record.userId;
    const hasValidUser = rawUserId && userIds.has(String(rawUserId));

    if (populatedUser) {
      record.userSnapshot = buildSnapshot(populatedUser);
      await record.save();
      repaired += 1;
      continue;
    }

    if (!hasValidUser && repairCandidates.length > 0) {
      let candidate = null;

      for (const user of repairCandidates) {
        const existingRecord = await Attendance.findOne({
          _id: { $ne: record._id },
          userId: user._id,
          dateKey: record.dateKey,
        });

        if (!existingRecord) {
          candidate = user;
          break;
        }
      }

      candidate = candidate || repairCandidates[0];
      record.userSnapshot = buildSnapshot(candidate);
      record.userId = candidate._id;
      await record.save();
      repaired += 1;
      continue;
    }

    if (!record.userSnapshot?.email) {
      record.userSnapshot = {
        name: "Unknown user",
        firstName: "",
        lastName: "",
        email: "",
        role: "",
        profileType: "",
      };
      await record.save();
      repaired += 1;
    }
  }

  if (repaired > 0) {
    logger.log(`Attendance records repaired: ${repaired}`);
  }
}

export async function resetAuthSystem({ connect = true, close = true, silent = false } = {}) {
  const logger = createLogger(silent);

  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing");
    }

    if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
      throw new Error("JWT_SECRET and JWT_REFRESH_SECRET are required");
    }

    if (connect && mongoose.connection.readyState !== 1) {
      logger.log("Connecting to MongoDB...");
      await mongoose.connect(process.env.MONGO_URI);
      logger.log("Connected\n");
    }

    await repairUserIndexes({ silent });
    await enforceSingleAdmin({ silent });

    if (process.env.RESET_ALL_USERS === "true") {
      const result = await User.deleteMany({ role: { $ne: "admin" } });
      logger.log(`Deleted ${result.deletedCount} non-admin user(s).`);
    }

    const accounts = getRecoveryAccounts();

    for (const account of accounts) {
      const result = await recreateAccount(account);
      logger.log(`Account ready: ${result.email}`);
      logger.log(`  Role: ${result.role}`);
      logger.log(`  ProfileType: ${result.profileType}`);
      logger.log(`  Password OK: ${result.passwordMatches}`);
      logger.log(`  JWT OK: ${result.tokenValid}`);
      logger.log("");
    }

    await repairAttendanceRecords({ silent });

    logger.log("Auth reset complete.");
    return { ok: true };
  } catch (error) {
    logger.error("Auth reset failed:", error.message);
    if (connect) {
      process.exitCode = 1;
    }
    return { ok: false, error };
  } finally {
    if (close) {
      await mongoose.connection.close().catch(() => {});
    }
  }
}

const isDirectRun = process.argv[1] === fileURLToPath(import.meta.url);

if (isDirectRun) {
  await resetAuthSystem();
}
