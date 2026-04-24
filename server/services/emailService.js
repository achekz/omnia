import nodemailer from "nodemailer";

let transporter;

function getEmailCredentials() {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    const error = new Error(
      "Email configuration missing. Set EMAIL_USER and EMAIL_PASS in your environment.",
    );
    error.code = "EMAIL_CONFIG_MISSING";
    throw error;
  }

  return { user, pass };
}

function getTransporter() {
  if (transporter) {
    return transporter;
  }

  const { user, pass } = getEmailCredentials();

  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user,
      pass,
    },
  });

  return transporter;
}

async function sendEmail({ to, subject, html }) {
  const { user } = getEmailCredentials();

  if (!to) {
    const error = new Error("Recipient email is required.");
    error.code = "EMAIL_RECIPIENT_MISSING";
    throw error;
  }

  try {
    const smtpTransporter = getTransporter();
    const info = await smtpTransporter.sendMail({
      from: `"Omni AI" <${user}>`,
      to,
      subject,
      html,
    });

    console.log(
      `[EMAIL] Sent "${subject}" to ${to}. Message ID: ${info.messageId}`,
    );

    return {
      success: true,
      messageId: info.messageId,
      accepted: info.accepted ?? [],
      rejected: info.rejected ?? [],
      response: info.response,
    };
  } catch (error) {
    console.error(`[EMAIL] Failed to send "${subject}" to ${to}`);
    console.error("[EMAIL] Error details:", {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode,
    });
    throw error;
  }
}

export async function verifyEmailTransport() {
  try {
    const smtpTransporter = getTransporter();
    await smtpTransporter.verify();
    console.log("[EMAIL] Gmail transporter verified successfully.");
    return true;
  } catch (error) {
    console.error("[EMAIL] Gmail transporter verification failed.");
    console.error("[EMAIL] Verify error details:", {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode,
    });
    throw error;
  }
}

export const sendAlert = async (to, subject, htmlContent) => {
  return sendEmail({
    to,
    subject,
    html: htmlContent,
  });
};

export const sendEmailVerificationCode = async (email, code, firstName = "there") => {
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px;">
      <h2 style="margin: 0 0 16px; color: #111827;">Verify your email</h2>
      <p style="margin: 0 0 16px; color: #4b5563;">Hi ${firstName}, use the code below to continue creating your Omni AI account.</p>
      <div style="font-size: 32px; letter-spacing: 8px; font-weight: 700; text-align: center; padding: 16px; background: #f3f4f6; border-radius: 12px; color: #111827;">
        ${code}
      </div>
      <p style="margin: 16px 0 0; color: #6b7280;">This code expires in 5 minutes.</p>
      <p style="margin: 16px 0 0; color: #6b7280;">Use a Gmail App Password for EMAIL_PASS. Regular Gmail passwords and less secure app access are not supported.</p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: "Your Omni AI verification code",
    html: htmlContent,
  });
};

export const sendPasswordResetCode = async (email, code, firstName = "there") => {
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
    subject: "Your Omni AI password reset code",
    html: htmlContent,
  });
};
