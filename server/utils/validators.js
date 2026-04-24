import { body, param, query, validationResult } from "express-validator";
import { ApiError } from "./ApiResponse.js";

const allowedRoles = ["student", "employee", "accountant"];
const allowedGenders = ["male", "female"];
const passwordPattern = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export const validateSendCode = [
  body("firstName")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("First name must be 2-50 characters"),
  body("lastName")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Last name must be 2-50 characters"),
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Valid email is required"),
  body("role")
    .isIn(allowedRoles)
    .withMessage("Role must be student, employee, or accountant"),
  body("gender")
    .isIn(allowedGenders)
    .withMessage("Gender must be male or female"),
];

export const validateVerifyCode = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Valid email is required"),
  body("code")
    .isLength({ min: 6, max: 6 })
    .matches(/^\d{6}$/)
    .withMessage("Verification code must be 6 digits"),
];

export const validateRegister = [
  body("firstName")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("First name must be 2-50 characters"),
  body("lastName")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Last name must be 2-50 characters"),
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Valid email is required"),
  body("role")
    .isIn(allowedRoles)
    .withMessage("Role must be student, employee, or accountant"),
  body("gender")
    .isIn(allowedGenders)
    .withMessage("Gender must be male or female"),
  body("password")
    .matches(passwordPattern)
    .withMessage("Password must be 8+ chars with uppercase, number, and special char"),
  body("confirmPassword")
    .custom((value, { req }) => value === req.body.password)
    .withMessage("Passwords do not match"),
];

export const validateLogin = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Valid email is required"),
  body("password")
    .notEmpty()
    .withMessage("Password is required"),
];

export const validateForgotPassword = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Valid email is required"),
];

export const validateVerifyResetCode = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Valid email is required"),
  body("code")
    .isLength({ min: 6, max: 6 })
    .matches(/^\d{6}$/)
    .withMessage("Reset code must be 6 digits"),
];

export const validateResetPassword = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Valid email is required"),
  body("password")
    .matches(passwordPattern)
    .withMessage("Password must be 8+ chars with uppercase, number, and special char"),
  body("confirmPassword")
    .custom((value, { req }) => value === req.body.password)
    .withMessage("Passwords do not match"),
];

export const validateUpdateProfile = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be 2-50 characters"),
  body("avatar")
    .optional()
    .isURL()
    .withMessage("Avatar must be a valid URL"),
  body("isPublic")
    .optional()
    .isBoolean()
    .withMessage("isPublic must be boolean"),
  body("preferences.emailNotifications")
    .optional()
    .isBoolean()
    .withMessage("Email notifications must be boolean"),
  body("preferences.theme")
    .optional()
    .isIn(["light", "dark", "auto"])
    .withMessage("Theme must be light, dark, or auto"),
];

export const validateEmailVerification = [
  body("newEmail")
    .isEmail()
    .normalizeEmail()
    .withMessage("Valid email is required"),
];

export const validateEmailCode = [
  body("code")
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage("Verification code must be 6 digits"),
];

export const validateCreateTask = [
  body("title")
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage("Title must be 3-100 characters"),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description max 500 characters"),
  body("dueDate")
    .optional()
    .isISO8601()
    .withMessage("Invalid date format"),
  body("priority")
    .optional()
    .isIn(["low", "medium", "high"])
    .withMessage("Priority must be low, medium, or high"),
  body("status")
    .optional()
    .isIn(["todo", "in-progress", "done"])
    .withMessage("Invalid status"),
];

export const validateUpdateTask = [
  param("id")
    .isMongoId()
    .withMessage("Invalid task ID"),
  body("title")
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage("Title must be 3-100 characters"),
  body("status")
    .optional()
    .isIn(["todo", "in-progress", "done"])
    .withMessage("Invalid status"),
];

export const validateCreateFinanceRecord = [
  body("description")
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage("Description must be 3-200 characters"),
  body("amount")
    .isFloat({ min: 0.01 })
    .withMessage("Amount must be positive number"),
  body("category")
    .isIn(["income", "expense", "investment", "savings"])
    .withMessage("Invalid category"),
  body("date")
    .isISO8601()
    .withMessage("Invalid date format"),
  body("type")
    .optional()
    .isIn(["credit_card", "bank_transfer", "cash", "check", "online"])
    .withMessage("Invalid payment type"),
];

export const validateSearch = [
  query("q")
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Search query must be 1-100 characters"),
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be 1-100"),
  query("sort")
    .optional()
    .isIn(["date", "relevance", "name", "amount"])
    .withMessage("Invalid sort option"),
];

export const validateMLPredict = [
  body("features")
    .optional()
    .isObject()
    .withMessage("Features must be object"),
];

export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
      value: err.value,
    }));

    throw new ApiError(400, "Validation failed", formattedErrors);
  }

  next();
};

export const sanitizeObject = (obj, allowedFields) => {
  const sanitized = {};
  allowedFields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(obj, field)) {
      sanitized[field] = obj[field];
    }
  });
  return sanitized;
};

export const validatePagination = (page = 1, limit = 10) => {
  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (p - 1) * l;

  return { page: p, limit: l, skip };
};
