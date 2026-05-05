const twilio = require("twilio");

const accountSid = process.env.TWILIO_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

const client =
  accountSid && authToken ? twilio(accountSid, authToken) : null;

async function sendSMS(to, body) {
  if (!client || !fromNumber) {
    console.warn("SMS skipped: Twilio is not configured.");
    return { skipped: true };
  }

  console.log("Sending SMS to:", to);
  console.log("Message:", body);

  try {
    return await client.messages.create({
      body,
      from: fromNumber,
      to,
    });
  } catch (error) {
    console.error("SMS ERROR:", error.message);
    throw error;
  }
}

module.exports = { sendSMS };
