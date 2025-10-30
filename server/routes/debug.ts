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

export const fixPendingDueToTwilioAuth: RequestHandler = async (_req, res) => {
  try {
    // Update pending send_logs with no provider id to failed with a clear message
    const { error, data } = await (await import("../lib/supabase")).supabase
      .from("send_logs")
      .update({ status: "failed", error_message: "Twilio authentication failed. Please verify credentials." })
      .is("twilio_message_sid", null)
      .eq("status", "pending");

    if (error) {
      console.error("fixPendingDueToTwilioAuth - update error:", error);
      return res.status(500).json({ success: false, error: error.message || String(error) });
    }

    return res.json({ success: true, updated: (data || []).length });
  } catch (error: any) {
    console.error("fixPendingDueToTwilioAuth error:", error);
    res.status(500).json({ success: false, error: error?.message || String(error) });
  }
};
