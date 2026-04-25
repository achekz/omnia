import { sendEmailVerificationCode } from "./emailService.js";

function getTwilioCredentials() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    const error = new Error("Twilio credentials are missing. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.");
    error.code = "TWILIO_CONFIG_MISSING";
    throw error;
  }

  return { accountSid, authToken };
}

async function sendTwilioMessage({ to, from, body }) {
  const { accountSid, authToken } = getTwilioCredentials();
  const authHeader = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  const payload = new URLSearchParams({
    To: to,
    From: from,
    Body: body,
  });

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${authHeader}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: payload.toString(),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || "Twilio message delivery failed.");
    error.code = data.code || "TWILIO_DELIVERY_FAILED";
    error.status = response.status;
    throw error;
  }

  return data;
}

export async function deliverVerificationCode({
  method,
  email,
  phoneNumber,
  code,
  firstName,
}) {
  if (method === "email") {
    const result = await sendEmailVerificationCode(email, code, firstName);
    return {
      provider: "gmail",
      channel: "email",
      deliveryId: result.messageId,
    };
  }

  const message = `OmniAI verification code: ${code}. It expires in 5 minutes.`;

  if (method === "sms") {
    const from = process.env.TWILIO_SMS_FROM;
    if (!from) {
      const error = new Error("TWILIO_SMS_FROM is missing.");
      error.code = "TWILIO_SMS_FROM_MISSING";
      throw error;
    }

    const result = await sendTwilioMessage({
      to: phoneNumber,
      from,
      body: message,
    });

    return {
      provider: "twilio",
      channel: "sms",
      deliveryId: result.sid,
    };
  }

  const from = process.env.TWILIO_WHATSAPP_FROM;
  if (!from) {
    const error = new Error("TWILIO_WHATSAPP_FROM is missing.");
    error.code = "TWILIO_WHATSAPP_FROM_MISSING";
    throw error;
  }

  const result = await sendTwilioMessage({
    to: `whatsapp:${phoneNumber}`,
    from: from.startsWith("whatsapp:") ? from : `whatsapp:${from}`,
    body: message,
  });

  return {
    provider: "twilio",
    channel: "whatsapp",
    deliveryId: result.sid,
  };
}
