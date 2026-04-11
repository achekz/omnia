import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendAlert = async (to, subject, htmlContent) => {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          body { font-family: 'Segoe UI', sans-serif; background: #0f172a; color: #e2e8f0; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 40px auto; background: #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 25px 50px rgba(0,0,0,0.5); }
          .header { background: linear-gradient(135deg, #7c3aed, #ec4899); padding: 32px; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; color: #fff; letter-spacing: -0.5px; }
          .header p { margin: 8px 0 0; color: rgba(255,255,255,0.8); font-size: 14px; }
          .body { padding: 32px; }
          .body h2 { font-size: 20px; color: #f1f5f9; margin-top: 0; }
          .body p { color: #94a3b8; line-height: 1.6; }
          .footer { padding: 20px 32px; border-top: 1px solid #334155; text-align: center; }
          .footer p { color: #475569; font-size: 12px; margin: 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✨ Omni AI</h1>
            <p>Intelligent Business Platform</p>
          </div>
          <div class="body">
            <h2>${subject}</h2>
            ${htmlContent}
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Omni AI. This is an automated alert.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const info = await transporter.sendMail({
    from: `"Omni AI" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });

  return info;
};

export const sendEmailVerificationCode = async (email, code) => {
  const htmlContent = `
    <p>Hello,</p>
    <p>You requested to change your email address. Use the verification code below to confirm your new email:</p>
    <div style="text-align: center; margin: 32px 0;">
      <div style="background: #334155; padding: 20px; border-radius: 8px; display: inline-block;">
        <p style="font-size: 24px; letter-spacing: 2px; margin: 0; color: #7c3aed; font-weight: bold;">${code}</p>
      </div>
    </div>
    <p style="color: #94a3b8;">This code is valid for 10 minutes only.</p>
    <p>If you didn't request this, please ignore this email.</p>
  `;

  return await sendAlert(email, 'Email Verification Code', htmlContent);
};
