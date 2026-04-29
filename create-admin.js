import readline from "readline";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const serverRequire = createRequire(resolve(__dirname, "server", "package.json"));

const bcrypt = serverRequire("bcryptjs");
const dotenv = serverRequire("dotenv");
const mongoose = serverRequire("mongoose");

dotenv.config({ path: resolve(__dirname, ".env") });
dotenv.config({ path: resolve(__dirname, "server", ".env"), override: true });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolveAnswer) => {
    rl.question(question, (answer) => resolveAnswer(answer.trim()));
  });
}

function askHidden(question) {
  return new Promise((resolveAnswer) => {
    const stdin = process.stdin;
    const stdout = process.stdout;
    let value = "";

    stdout.write(question);
    stdin.setRawMode?.(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    const onData = (char) => {
      if (char === "\u0003") {
        stdout.write("\n");
        process.exit(130);
      }

      if (char === "\r" || char === "\n") {
        stdout.write("\n");
        stdin.setRawMode?.(false);
        stdin.pause();
        stdin.removeListener("data", onData);
        resolveAnswer(value);
        return;
      }

      if (char === "\u0008" || char === "\u007f") {
        value = value.slice(0, -1);
        return;
      }

      value += char;
    };

    stdin.on("data", onData);
  });
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getMongoUri() {
  return process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DATABASE_URL;
}

async function main() {
  try {
    const email = (await ask("Enter admin email: ")).toLowerCase();

    if (!isValidEmail(email)) {
      throw new Error("Invalid email format.");
    }

    const password = await askHidden("Enter admin password: ");

    if (!password || password.length < 8) {
      throw new Error("Password must be at least 8 characters.");
    }

    const mongoUri = getMongoUri();

    if (!mongoUri) {
      throw new Error("MongoDB URI missing. Set MONGO_URI in server/.env.");
    }

    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });

    const users = mongoose.connection.db.collection("users");

    const existingAdmin = await users.findOne({
      $or: [{ email }, { role: "admin" }, { profileType: "admin" }],
    });

    if (existingAdmin) {
      console.log(`Admin already exists: ${existingAdmin.email}`);
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const now = new Date();

    await users.insertOne({
      firstName: "Admin",
      lastName: "User",
      name: "Admin User",
      email,
      password: hashedPassword,
      role: "admin",
      profileType: "admin",
      verificationMethod: "email",
      gender: "male",
      isVerified: true,
      isActive: true,
      avatar: "",
      preferences: {
        theme: "light",
        emailNotifications: true,
      },
      notificationPreferences: {
        emailNotifications: true,
        inAppMentions: true,
        taskUpdates: true,
        aiInsights: true,
        marketingUpdates: false,
      },
      isPublic: false,
      createdAt: now,
      updatedAt: now,
    });

    console.log("Admin user created successfully.");
    console.log(`Email: ${email}`);
  } catch (error) {
    console.error(`Failed to create admin user: ${error.message}`);
    process.exitCode = 1;
  } finally {
    rl.close();
    await mongoose.connection.close().catch(() => {});
  }
}

main();
