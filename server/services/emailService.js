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
            <h1>✨ OmniAI</h1>
            <p>Intelligent Business Platform</p>
          </div>
          <div class="body">
            <h2>${subject}</h2>
            ${htmlContent}
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} OmniAI. This is an automated alert.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const info = await transporter.sendMail({
    from: `"OmniAI" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });

  return info;
};
