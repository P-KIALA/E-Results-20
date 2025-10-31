import { Request, Response } from "express";
import { supabase } from "../lib/supabase";

export async function twilioStatusWebhook(req: Request, res: Response) {
  try {
    // Twilio will POST form-encoded fields like MessageSid, MessageStatus
    const body = req.body || {};
    const messageSid = body.MessageSid || body.MessageSid || body.SmsSid || body.SmsMessageSid;
    const messageStatus = (body.MessageStatus || body.MessageStatus || body.SmsStatus || null) as string | null;

    if (!messageSid) {
      console.warn("twilioStatusWebhook: no MessageSid in payload", body);
      return res.status(200).send("ok");
    }

    // Map Twilio status to our statuses
    const map: Record<string, string> = {
      queued: "sent",
      sending: "sent",
      sent: "sent",
      delivered: "delivered",
      read: "read",
      failed: "failed",
      undelivered: "failed",
    };

    const mapped = messageStatus ? map[messageStatus.toLowerCase()] || messageStatus : "sent";

    const updateData: any = { status: mapped };
    if (mapped === "sent") updateData.sent_at = new Date().toISOString();
    if (mapped === "delivered") updateData.delivered_at = new Date().toISOString();
    if (mapped === "read") updateData.read_at = new Date().toISOString();

    // Update send_logs where provider_message_id equals messageSid
    const { error } = await supabase
      .from("send_logs")
      .update(updateData)
      .eq("provider_message_id", messageSid);

    if (error) {
      console.error("twilioStatusWebhook: failed to update send_logs", error);
      return res.status(500).json({ ok: false, error: "Failed to update send log" });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("twilioStatusWebhook error:", err);
    res.status(500).json({ ok: false, error: String(err) });
  }
}
