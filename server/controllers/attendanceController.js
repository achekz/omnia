import Attendance from "../models/Attendance.js";
import User from "../models/User.js";
import { emitToRole, emitToUser } from "../config/socket.js";
import * as notifService from "../services/notifService.js";
import { createAndSendVerificationCode, verifyOtpCode } from "../services/verificationCodeService.js";
import { ApiError, ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const USER_ROLES = ["employee", "stagiaire", "comptable", "admin"];

function getDateParts(now = new Date(Date.now())) {
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return {
    dayStart,
    dateKey: `${year}-${month}-${day}`,
  };
}

function minutesSinceMidnight(date) {
  return date.getHours() * 60 + date.getMinutes();
}

function formatClock(date) {
  return date.toLocaleTimeString("en-GB", { hour12: false });
}

function getCheckInState(now = new Date(Date.now())) {
  const minutes = minutesSinceMidnight(now);

  if (minutes < 8 * 60 || minutes >= 18 * 60) {
    throw new ApiError(400, "Attendance can only be marked from 08:00 to 17:59");
  }

  if (minutes <= 8 * 60 + 30) {
    return { status: "on_time", delayMinutes: 0, requiresReason: false };
  }

  const delayMinutes = Math.max(0, minutes - (8 * 60 + 30));

  if (minutes <= 10 * 60 + 30) {
    return { status: "late", delayMinutes, requiresReason: true };
  }

  return { status: "very_late", delayMinutes, requiresReason: true };
}

function getCheckOutState(now = new Date(Date.now())) {
  const minutes = minutesSinceMidnight(now);

  if (minutes < 16 * 60) {
    return { checkOutStatus: "very_early", requiresReason: true };
  }

  if (minutes <= 17 * 60) {
    return { checkOutStatus: "early", requiresReason: true };
  }

  return { checkOutStatus: "on_time", requiresReason: false };
}

async function notifyAdmins(req, payload) {
  const filter = { role: "admin" };
  if (req.tenantId) {
    filter.tenantId = req.tenantId;
  }

  const admins = await User.find(filter).select("_id").lean();

  await Promise.all(
    admins.map((admin) =>
      notifService.create(admin._id, req.tenantId, {
        ...payload,
        source: "system",
      }),
    ),
  );
}

function serializeAttendance(record) {
  if (!record) return null;
  const raw = typeof record.toObject === "function" ? record.toObject() : record;
  return {
    ...raw,
    checkInTime: raw.checkIn ? formatClock(new Date(raw.checkIn)) : null,
    checkOutTime: raw.checkOut ? formatClock(new Date(raw.checkOut)) : null,
  };
}

export const getMyAttendance = asyncHandler(async (req, res) => {
  const { month, year } = req.query;
  const now = new Date(Date.now());
  const requestedYear = Number(year) || now.getFullYear();
  const requestedMonth = Number(month) || now.getMonth() + 1;
  const start = new Date(requestedYear, requestedMonth - 1, 1);
  const end = new Date(requestedYear, requestedMonth, 1);
  const { dateKey } = getDateParts(now);

  const filter = {
    userId: req.user._id,
    date: { $gte: start, $lt: end },
  };

  const records = await Attendance.find(filter).sort({ date: 1 }).lean();
  const today = records.find((record) => record.dateKey === dateKey) || null;

  res.json(
    new ApiResponse(200, {
      records: records.map(serializeAttendance),
      today: serializeAttendance(today),
      serverTime: now.toISOString(),
    }),
  );
});

export const sendAttendanceCode = asyncHandler(async (req, res) => {
  const { action = "check-in", reason = "" } = req.body;
  const now = new Date(Date.now());
  const { dateKey } = getDateParts(now);

  if (!USER_ROLES.includes(String(req.user.role).toLowerCase())) {
    throw new ApiError(403, "Role not allowed to mark attendance");
  }

  const today = await Attendance.findOne({ userId: req.user._id, dateKey });

  if (action === "check-in") {
    if (today?.checkIn) {
      throw new ApiError(409, "Attendance already marked for today");
    }

    const checkInState = getCheckInState(now);
    if (checkInState.requiresReason && !String(reason).trim()) {
      throw new ApiError(400, "Reason is required for late attendance");
    }
  } else if (action === "check-out") {
    if (!today?.checkIn) {
      throw new ApiError(400, "Check-in is required before check-out");
    }

    if (today.checkOut) {
      throw new ApiError(409, "Check-out already marked for today");
    }

    const checkOutState = getCheckOutState(now);
    if (checkOutState.requiresReason && !String(reason).trim()) {
      throw new ApiError(400, "Reason is required for early check-out");
    }
  } else {
    throw new ApiError(400, "Invalid attendance action");
  }

  await createAndSendVerificationCode({
    purpose: "presence",
    type: "presence",
    email: req.user.email,
    firstName: req.user.firstName || req.user.name || "User",
    lastName: req.user.lastName || "",
    role: req.user.role,
    gender: req.user.gender || "male",
  });

  res.json(new ApiResponse(200, { action }, "Verification code sent"));
});

export const confirmAttendance = asyncHandler(async (req, res) => {
  const { action = "check-in", code, reason = "" } = req.body;
  const now = new Date(Date.now());
  const { dayStart, dateKey } = getDateParts(now);

  if (!code) {
    throw new ApiError(400, "Verification code is required");
  }

  const verification = await verifyOtpCode({
    purpose: "presence",
    email: req.user.email,
    code,
  });

  if (!verification.verified) {
    throw new ApiError(400, verification.reason || "Invalid verification code");
  }

  verification.verification.consumedAt = now;
  await verification.verification.save();

  let attendance;

  if (action === "check-in") {
    const checkInState = getCheckInState(now);
    if (checkInState.requiresReason && !String(reason).trim()) {
      throw new ApiError(400, "Reason is required for late attendance");
    }

    try {
      attendance = await Attendance.create({
        userId: req.user._id,
        tenantId: req.tenantId,
        date: dayStart,
        dateKey,
        checkIn: now,
        status: checkInState.status,
        delayMinutes: checkInState.delayMinutes,
        reason: String(reason).trim(),
      });
    } catch (error) {
      if (error?.code === 11000) {
        throw new ApiError(409, "Attendance already marked for today");
      }
      throw error;
    }

    await attendance.populate("userId", "name firstName lastName email role profileType");

    await notifService.create(req.user._id, req.tenantId, {
      type: checkInState.status === "on_time" ? "info" : "warning",
      title: "Attendance marked",
      message: `Check-in recorded at ${formatClock(now)}.`,
      source: "system",
      actionUrl: "/presence",
      metadata: { attendanceId: attendance._id.toString(), status: checkInState.status },
    });

    if (checkInState.status !== "on_time") {
      await notifyAdmins(req, {
        type: checkInState.status === "very_late" ? "danger" : "warning",
        title: "Late attendance",
        message: `${req.user.name} checked in ${checkInState.delayMinutes} minutes late.`,
        actionUrl: "/admin/presences",
        metadata: { attendanceId: attendance._id.toString(), userId: req.user._id.toString() },
      });
    }

    emitToUser(req.user._id.toString(), "attendance_marked", { attendance });
    emitToRole("admin", "attendance_marked", { attendance });

    return res.status(201).json(new ApiResponse(201, { attendance: serializeAttendance(attendance) }, "Attendance marked"));
  }

  if (action === "check-out") {
    const checkOutState = getCheckOutState(now);
    if (checkOutState.requiresReason && !String(reason).trim()) {
      throw new ApiError(400, "Reason is required for early check-out");
    }

    attendance = await Attendance.findOne({ userId: req.user._id, dateKey });
    if (!attendance?.checkIn) {
      throw new ApiError(400, "Check-in is required before check-out");
    }
    if (attendance.checkOut) {
      throw new ApiError(409, "Check-out already marked for today");
    }

    attendance.checkOut = now;
    attendance.checkOutStatus = checkOutState.checkOutStatus;
    attendance.checkOutReason = String(reason).trim();
    await attendance.save();
    await attendance.populate("userId", "name firstName lastName email role profileType");

    await notifService.create(req.user._id, req.tenantId, {
      type: checkOutState.checkOutStatus === "on_time" ? "info" : "warning",
      title: "Check-out marked",
      message: `Check-out recorded at ${formatClock(now)}.`,
      source: "system",
      actionUrl: "/presence",
      metadata: { attendanceId: attendance._id.toString(), status: checkOutState.checkOutStatus },
    });

    if (checkOutState.checkOutStatus !== "on_time") {
      await notifyAdmins(req, {
        type: checkOutState.checkOutStatus === "very_early" ? "danger" : "warning",
        title: "Early leave",
        message: `${req.user.name} checked out early at ${formatClock(now)}.`,
        actionUrl: "/admin/presences",
        metadata: { attendanceId: attendance._id.toString(), userId: req.user._id.toString() },
      });
    }

    emitToUser(req.user._id.toString(), "attendance_marked", { attendance });
    emitToRole("admin", "attendance_marked", { attendance });

    return res.json(new ApiResponse(200, { attendance: serializeAttendance(attendance) }, "Check-out marked"));
  }

  throw new ApiError(400, "Invalid attendance action");
});

export const getAllAttendance = asyncHandler(async (req, res) => {
  const filter = req.tenantId ? { tenantId: req.tenantId } : {};

  const records = await Attendance.find(filter)
    .populate("userId", "name firstName lastName email role profileType")
    .sort({ date: -1, checkIn: 1 })
    .limit(500);

  res.json(new ApiResponse(200, { records: records.map(serializeAttendance) }, "Attendance records retrieved"));
});

export default {
  getMyAttendance,
  sendAttendanceCode,
  confirmAttendance,
  getAllAttendance,
};
