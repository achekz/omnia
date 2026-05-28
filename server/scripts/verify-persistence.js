// Role du fichier: verifie que MongoDB persiste bien les ecritures critiques.
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import Notification from "../models/Notification.js";
import Task from "../models/Task.js";
import User from "../models/User.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "..", ".env"), override: true });

function uniqueEmail() {
  return `persistence-check-${Date.now()}@example.com`;
}

async function reconnect() {
  await mongoose.disconnect();
  const result = await connectDB();
  if (!result.connected) {
    throw result.error || new Error("MongoDB reconnect failed");
  }
}

async function main() {
  const result = await connectDB();
  if (!result.connected) {
    throw result.error || new Error(result.userMessage || "MongoDB connection failed");
  }

  const email = uniqueEmail();
  let userId;
  let taskId;
  let notificationId;

  try {
    const user = await User.create({
      firstName: "Persistence",
      lastName: "Check",
      email,
      phoneNumber: `+216${String(Date.now()).slice(-8)}`,
      city: "tunisia",
      password: "PersistenceCheck123!",
      role: "employee",
      profileType: "employee",
      verificationMethod: "email",
      gender: "male",
      isVerified: true,
      isActive: true,
    });
    userId = user._id;

    const savedUser = await User.findById(userId);
    if (!savedUser) throw new Error("User was not persisted after create");

    const task = await Task.create({
      title: "Persistence verification task",
      description: "Temporary task created by server/scripts/verify-persistence.js",
      assignedTo: userId,
      createdBy: userId,
      assignedBy: userId,
      assignedRole: "employee",
      role: "employee",
      status: "todo",
      priority: "medium",
      dueDate: new Date(Date.now() + 60 * 60 * 1000),
    });
    taskId = task._id;

    const savedTask = await Task.findById(taskId);
    if (!savedTask) throw new Error("Task was not persisted after create");

    const notification = await Notification.create({
      userId,
      type: "info",
      title: "Persistence verification",
      message: "Temporary notification created by persistence check",
      source: "system",
    });
    notificationId = notification._id;

    const savedNotification = await Notification.findById(notificationId);
    if (!savedNotification) throw new Error("Notification was not persisted after create");

    await reconnect();

    const [userAfterReconnect, taskAfterReconnect, notificationAfterReconnect] = await Promise.all([
      User.findById(userId),
      Task.findById(taskId),
      Notification.findById(notificationId),
    ]);

    if (!userAfterReconnect) throw new Error("User disappeared after reconnect");
    if (!taskAfterReconnect) throw new Error("Task disappeared after reconnect");
    if (!notificationAfterReconnect) throw new Error("Notification disappeared after reconnect");

    console.log("Persistence verification passed:", {
      database: mongoose.connection.name,
      userId: userId.toString(),
      taskId: taskId.toString(),
      notificationId: notificationId.toString(),
    });
  } finally {
    await Promise.allSettled([
      taskId ? Task.deleteOne({ _id: taskId }) : Promise.resolve(),
      notificationId ? Notification.deleteOne({ _id: notificationId }) : Promise.resolve(),
      userId ? User.deleteOne({ _id: userId }) : Promise.resolve(),
    ]);
    await mongoose.disconnect();
  }
}

main().catch(async (error) => {
  console.error("Persistence verification failed:", {
    message: error.message,
    stack: error.stack,
  });
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
