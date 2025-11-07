import { RequestHandler } from "express";
import { supabase } from "../lib/supabase";

export const deleteSendLog: RequestHandler = async (req, res) => {
  try {
    const sendLogId = req.params.id;
    if (!sendLogId) return res.status(400).json({ error: "send_log_id is required" });

    // Fetch the send_log
    const { data: log, error: logErr } = await supabase
      .from("send_logs")
      .select("id, provider_message_id")
      .eq("id", String(sendLogId))
      .single();

    if (logErr) {
      console.error("deleteSendLog: failed to fetch send_log", logErr);
      return res.status(500).json({ error: "Failed to fetch send_log" });
    }

    if (!log) return res.status(404).json({ error: "send_log not found" });

    const providerMessageId = log.provider_message_id;

    // Attempt to delete from Twilio if we have a provider message id and Twilio credentials
    if (providerMessageId) {
      try {
        const envAccountSid = process.env.TWILIO_ACCOUNT_SID;
        const envAccountToken = process.env.TWILIO_AUTH_TOKEN;
        const envApiKey = process.env.TWILIO_API_KEY || undefined;
        const envApiSecret = process.env.TWILIO_API_SECRET || undefined;

        const accountSid = envAccountSid;
        // Use API Key auth only when both api key and secret are present; otherwise use account SID/token
        const authUser = envApiKey && envApiSecret ? envApiKey : envAccountSid;
        const authPass = envApiSecret && envApiKey ? envApiSecret : envAccountToken;

        if (accountSid && authUser && authPass) {
          const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages/${providerMessageId}.json`;
          const resp = await fetch(url, {
            method: "DELETE",
            headers: {
              Authorization: `Basic ${Buffer.from(`${authUser}:${authPass}`).toString("base64")}`,
            },
          });

          // Twilio returns 204 No Content on success; allow 200/204
          if (!resp.ok && resp.status !== 204) {
            const text = await resp.text().catch(() => "");
            console.warn("deleteSendLog: Twilio delete failed", resp.status, text);
            // Don't fail the whole operation — continue to mark as deleted locally
          }
        }
      } catch (e) {
        console.warn("deleteSendLog: error calling Twilio delete", e);
      }
    }

    // Soft-delete the send_log: mark status deleted and set deleted_at
    const updates: any = { status: "deleted", deleted_at: new Date().toISOString() };
    if ((req as any).userId) updates.deleted_by = (req as any).userId;

    const { error: updateErr } = await supabase
      .from("send_logs")
      .update(updates)
      .eq("id", String(sendLogId));

    if (updateErr) {
      console.error("deleteSendLog: failed to update send_log", updateErr);
      return res.status(500).json({ error: "Failed to mark send_log deleted" });
    }

    return res.json({ ok: true });
  } catch (error: any) {
    console.error("deleteSendLog error:", error);
    res.status(500).json({ error: error?.message || "Failed to delete send_log" });
  }
};
