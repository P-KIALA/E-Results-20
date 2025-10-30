import { RequestHandler } from "express";
import twilio from "twilio";

export const twilioTest: RequestHandler = async (_req, res) => {
  try {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      return res
        .status(400)
        .json({ error: "TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN not set" });
    }

    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN,
    );

    // Try to fetch account resource
    try {
      const account = await client.api
        .accounts(process.env.TWILIO_ACCOUNT_SID)
        .fetch();
      return res.json({
        success: true,
        sid: account.sid,
        friendlyName: account.friendlyName,
      });
    } catch (e: any) {
      // Twilio SDK throws on authentication errors; return structured info for debugging
      return res
        .status(502)
        .json({ success: false, message: e?.message || String(e) });
    }
  } catch (error: any) {
    console.error("twilioTest error:", error);
    res.status(500).json({ error: error?.message || String(error) });
  }
};
