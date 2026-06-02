// Role du fichier: regroupe la logique metier reutilisable et les integrations externes.
import nodemailer from "nodemailer";
import { logExternalError, logExternalRequest, logExternalResponse, sanitizeForLog } from "../utils/networkDiagnostics.js";

const transporters = new Map();
const DEFAULT_FROM_NAME = "OmniAI Platform";

// Role: Recupere les donnees necessaires.
function getEmailCredentials() {
  const user = process.env.EMAIL_USER?.trim();
  const pass = (process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS)?.replace(/\s+/g, "");

  if (!user || !pass) {
    const error = new Error(
      "Email configuration missing. Set EMAIL_USER and EMAIL_PASSWORD (or EMAIL_PASS) in your environment.",
    );
    error.code = "EMAIL_CONFIG_MISSING";
    throw error;
  }

  return { user, pass };
}

// Role: Recupere les donnees necessaires.
function getSystemSender() {
  const { user } = getEmailCredentials();
  const fromName = process.env.EMAIL_FROM_NAME?.trim() || DEFAULT_FROM_NAME;

  return `"${fromName}" <${user}>`;
}

// Role: Cree une nouvelle ressource.
function createTransporter(mode = "gmail-service") {
  const { user, pass } = getEmailCredentials();
  const smtpHost = process.env.SMTP_HOST?.trim() || "smtp.gmail.com";
  const smtpPort = Number(process.env.SMTP_PORT || (mode === "ssl-ipv4" ? 465 : 587));
  const smtpSecure = String(process.env.SMTP_SECURE || "").toLowerCase() === "true" || smtpPort === 465;
  const baseConfig = {
    auth: {
      user,
      pass,
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  };

  if (mode === "smtp-env") {
    return nodemailer.createTransport({
      ...baseConfig,
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      requireTLS: !smtpSecure,
      name: "localhost",
      family: 4,
      tls: {
        minVersion: "TLSv1.2",
        servername: smtpHost,
        rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== "false",
      },
    });
  }

  if (mode === "gmail-service") {
    return nodemailer.createTransport({
      ...baseConfig,
      service: "gmail",
      tls: {
        minVersion: "TLSv1.2",
        servername: "smtp.gmail.com",
        rejectUnauthorized: true,
      },
    });
  }

  if (mode === "starttls-ipv4") {
    return nodemailer.createTransport({
      ...baseConfig,
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      requireTLS: true,
      name: "localhost",
      family: 4,
      tls: {
        minVersion: "TLSv1.2",
        servername: "smtp.gmail.com",
        rejectUnauthorized: true,
      },
    });
  }

  return nodemailer.createTransport({
    ...baseConfig,
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    name: "localhost",
    family: 4,
    tls: {
      minVersion: "TLSv1.2",
      servername: "smtp.gmail.com",
      rejectUnauthorized: true,
    },
  });
}

// Role: Recupere les donnees necessaires.
function getTransporter(mode = "gmail-service") {
  if (transporters.has(mode)) {
    return transporters.get(mode);
  }

  const transporter = createTransporter(mode);
  transporters.set(mode, transporter);

  return transporter;
}

// Role: Retourne un etat booleen.
function shouldRetryWithAlternateMode(error) {
  const message = String(error?.message || "").toLowerCase();

  return [
    "ssl3_read_bytes",
    "tlsv1 alert internal error",
    "alert number 80",
    "wrong version number",
    "ssl routines",
    "tls",
    "esocket",
  ].some((pattern) => message.includes(pattern) || String(error?.code || "").toLowerCase().includes(pattern));
}

function getTransportDescription(mode) {
  const smtpHost = process.env.SMTP_HOST?.trim() || "smtp.gmail.com";
  const smtpPort = Number(process.env.SMTP_PORT || (mode === "ssl-ipv4" ? 465 : 587));

  if (mode === "gmail-service") {
    return {
      service: "gmail",
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      tls: { minVersion: "TLSv1.2", servername: "smtp.gmail.com", rejectUnauthorized: true },
    };
  }

  if (mode === "smtp-env") {
    return {
      host: smtpHost,
      port: smtpPort,
      secure: String(process.env.SMTP_SECURE || "").toLowerCase() === "true" || smtpPort === 465,
      requireTLS: smtpPort !== 465,
      tls: {
        minVersion: "TLSv1.2",
        servername: smtpHost,
        rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== "false",
      },
    };
  }

  if (mode === "starttls-ipv4") {
    return {
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      requireTLS: true,
      family: 4,
      tls: { minVersion: "TLSv1.2", servername: "smtp.gmail.com", rejectUnauthorized: true },
    };
  }

  return {
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    family: 4,
    tls: { minVersion: "TLSv1.2", servername: "smtp.gmail.com", rejectUnauthorized: true },
  };
}

// Role: Envoie un message ou une notification.
async function sendWithMode({ mode, to, subject, html, text }) {
  const smtpTransporter = getTransporter(mode);
  logExternalRequest("EMAIL", {
    method: "SMTP_SEND",
    url: `${getTransportDescription(mode).secure ? "smtps" : "smtp"}://${getTransportDescription(mode).host || "smtp.gmail.com"}:${getTransportDescription(mode).port}`,
    data: { from: getSystemSender(), to, subject, hasHtml: Boolean(html), hasText: Boolean(text) },
    metadata: { mode, transport: getTransportDescription(mode) },
  });
  const info = await smtpTransporter.sendMail({
    from: getSystemSender(),
    to,
    subject,
    html,
    text,
  });

  console.log(
    `[EMAIL] Sent "${subject}" to ${to} using Gmail ${mode}. Message ID: ${info.messageId}`,
  );
  logExternalResponse("EMAIL", {
    method: "SMTP_SEND",
    url: `${getTransportDescription(mode).secure ? "smtps" : "smtp"}://${getTransportDescription(mode).host || "smtp.gmail.com"}:${getTransportDescription(mode).port}`,
    status: "sent",
    data: info,
    metadata: { mode },
  });

  return {
    success: true,
    messageId: info.messageId,
    accepted: info.accepted ?? [],
    rejected: info.rejected ?? [],
    response: info.response,
    transportMode: mode,
  };
}

// Role: Recupere les donnees necessaires.
function getTransportModesForError(error) {
  if (!error) {
    return process.env.SMTP_HOST ? ["smtp-env", "starttls-ipv4", "ssl-ipv4", "gmail-service"] : ["starttls-ipv4", "ssl-ipv4", "gmail-service"];
  }

  if (shouldRetryWithAlternateMode(error)) {
    return process.env.SMTP_HOST ? ["smtp-env", "starttls-ipv4", "ssl-ipv4"] : ["starttls-ipv4", "ssl-ipv4"];
  }

  return [];
}

// Role: Envoie un message ou une notification.
async function sendEmail({ to, subject, html, text }) {
  getEmailCredentials();

  if (!to) {
    const error = new Error("Recipient email is required.");
    error.code = "EMAIL_RECIPIENT_MISSING";
    throw error;
  }

  const attemptedModes = [];
  const firstMode = process.env.SMTP_HOST ? "smtp-env" : "gmail-service";

  try {
    attemptedModes.push(firstMode);
    return await sendWithMode({
      mode: firstMode,
      to,
      subject,
      html,
      text,
    });
  } catch (error) {
    console.error(`[EMAIL] Failed to send "${subject}" to ${to}`);
    logExternalError("EMAIL", error, {
      method: "SMTP_SEND",
      url: `${getTransportDescription(attemptedModes[0]).secure ? "smtps" : "smtp"}://${getTransportDescription(attemptedModes[0]).host || "smtp.gmail.com"}:${getTransportDescription(attemptedModes[0]).port}`,
      metadata: { attemptedModes, transport: getTransportDescription(attemptedModes[0]) },
    });
    console.error("[EMAIL] Error details:", sanitizeForLog({
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode,
      stack: error.stack,
    }));

    for (const mode of getTransportModesForError(error)) {
      if (attemptedModes.includes(mode)) {
        continue;
      }

      console.warn(`[EMAIL] Retrying with Gmail transport mode: ${mode}`);
      attemptedModes.push(mode);

      try {
        return await sendWithMode({
          mode,
          to,
          subject,
          html,
          text,
        });
      } catch (retryError) {
        logExternalError("EMAIL", retryError, {
          method: "SMTP_SEND",
          url: `${getTransportDescription(mode).secure ? "smtps" : "smtp"}://${getTransportDescription(mode).host || "smtp.gmail.com"}:${getTransportDescription(mode).port}`,
          metadata: { attemptedModes, transport: getTransportDescription(mode) },
        });
        console.error(`[EMAIL] Retry with ${mode} failed:`, sanitizeForLog({
          message: retryError.message,
          code: retryError.code,
          command: retryError.command,
          response: retryError.response,
          responseCode: retryError.responseCode,
          stack: retryError.stack,
        }));

        if (mode === attemptedModes[attemptedModes.length - 1]) {
          error = retryError;
        }
      }
    }

    error.attemptedModes = attemptedModes;
    throw error;
  }
}

// Role: Verifie les donnees ou les droits.
export async function verifyEmailTransport() {
  const firstMode = process.env.SMTP_HOST ? "smtp-env" : "gmail-service";
  try {
    logExternalRequest("EMAIL", {
      method: "SMTP_VERIFY",
      url: `${getTransportDescription(firstMode).secure ? "smtps" : "smtp"}://${getTransportDescription(firstMode).host || "smtp.gmail.com"}:${getTransportDescription(firstMode).port}`,
      metadata: { mode: firstMode, transport: getTransportDescription(firstMode) },
    });
    await getTransporter(firstMode).verify();
    console.log(`[EMAIL] Transporter verified successfully with ${firstMode}.`);
    return true;
  } catch (error) {
    console.error(`[EMAIL] Transporter verification failed with ${firstMode}.`);
    logExternalError("EMAIL", error, {
      method: "SMTP_VERIFY",
      url: `${getTransportDescription(firstMode).secure ? "smtps" : "smtp"}://${getTransportDescription(firstMode).host || "smtp.gmail.com"}:${getTransportDescription(firstMode).port}`,
      metadata: { mode: firstMode, transport: getTransportDescription(firstMode) },
    });
    console.error("[EMAIL] Verify error details:", sanitizeForLog({
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode,
      stack: error.stack,
    }));

    for (const mode of getTransportModesForError(error)) {
      try {
        console.warn(`[EMAIL] Retrying transporter verification with ${mode}...`);
        await getTransporter(mode).verify();
        console.log(`[EMAIL] Gmail transporter verified successfully with ${mode}.`);
        return true;
      } catch (retryError) {
        console.error(`[EMAIL] Verification retry with ${mode} failed:`, {
          message: retryError.message,
          code: retryError.code,
          command: retryError.command,
          response: retryError.response,
          responseCode: retryError.responseCode,
        });
        error = retryError;
      }
    }

    throw error;
  }
}

// Role: Envoie un message ou une notification.
export const sendAlert = async (to, subject, htmlContent) => {
  return sendEmail({
    to,
    subject,
    html: htmlContent,
  });
};

// Role: Envoie un message ou une notification.
export const sendEmailVerificationCode = async (email, code, firstName = "there") => {
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px;">
      <h2 style="margin: 0 0 16px; color: #111827;">Verify your email</h2>
      <p style="margin: 0 0 16px; color: #4b5563;">Hi ${firstName}, use the code below to continue creating your OmniAI account.</p>
      <div style="font-size: 32px; letter-spacing: 8px; font-weight: 700; text-align: center; padding: 16px; background: #f3f4f6; border-radius: 12px; color: #111827;">
        ${code}
      </div>
      <p style="margin: 16px 0 0; color: #6b7280;">This code expires in 5 minutes.</p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: "Your OmniAI verification code",
    html: htmlContent,
  });
};

// Role: Envoie un message ou une notification.
export const sendPasswordResetCode = async (email, code, firstName = "there") => {
  const textContent = `Your verification code is: ${code}`;
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px;">
      <h2 style="margin: 0 0 16px; color: #111827;">Reset your password</h2>
      <p style="margin: 0 0 16px; color: #4b5563;">Hi ${firstName}, use the code below to continue resetting your Omni AI password.</p>
      <div style="font-size: 32px; letter-spacing: 8px; font-weight: 700; text-align: center; padding: 16px; background: #f3f4f6; border-radius: 12px; color: #111827;">
        ${code}
      </div>
      <p style="margin: 16px 0 0; color: #6b7280;">This reset code expires in 5 minutes.</p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: "Password Reset Code",
    text: textContent,
    html: htmlContent,
  });
};
