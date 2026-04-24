export const sendAlert = async (to, subject, htmlContent) => {
  console.log(`[EMAIL STUB] To: ${to}`);
  console.log(`[EMAIL STUB] Subject: ${subject}`);
  console.log(`[EMAIL STUB] Content preview: ${htmlContent.substring(0, 200)}...`);

  return { messageId: "stub-123", accepted: [to] };
};

export const sendEmailVerificationCode = async (email, code, firstName) => {
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px;">
      <h2 style="margin: 0 0 16px; color: #111827;">Verify your email</h2>
      <p style="margin: 0 0 16px; color: #4b5563;">Hi ${firstName}, use the code below to continue creating your Omni AI account.</p>
      <div style="font-size: 32px; letter-spacing: 8px; font-weight: 700; text-align: center; padding: 16px; background: #f3f4f6; border-radius: 12px; color: #111827;">
        ${code}
      </div>
      <p style="margin: 16px 0 0; color: #6b7280;">This code expires in 5 minutes.</p>
    </div>
  `;

  return sendAlert(email, "Your Omni AI verification code", htmlContent);
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

  return sendAlert(email, "Your Omni AI password reset code", htmlContent);
};
