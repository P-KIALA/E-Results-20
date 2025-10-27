import { RequestHandler } from "express";
import twilio from "twilio";
import { supabase } from "../lib/supabase";
import { SendResultsRequest } from "@shared/api";

// Initialize Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
);

async function sendViaWhatsApp(
  to: string,
  message: string,
  mediaUrls: string[],
): Promise<string> {
  try {
    const messageParams: any = {
      from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
      to: `whatsapp:${to}`,
      body: message,
    };

    if (mediaUrls.length > 0) {
      messageParams.mediaUrl = mediaUrls;
    }

    const result = await twilioClient.messages.create(messageParams);

    console.log(`Message sent successfully to ${to}: ${result.sid}`);
    return result.sid;
  } catch (error) {
    console.error(`Error sending WhatsApp message to ${to}:`, error);
    throw error;
  }
}

export const sendResults: RequestHandler = async (req, res) => {
  try {
    const { doctor_ids, custom_message, file_ids } =
      req.body as SendResultsRequest;

    if (!doctor_ids || doctor_ids.length === 0 || !custom_message) {
      return res
        .status(400)
        .json({ error: "doctor_ids and custom_message are required" });
    }

    const results: any[] = [];

    for (const doctor_id of doctor_ids) {
      // Get doctor
      const { data: doctor, error: docError } = await supabase
        .from("doctors")
        .select("phone, name, whatsapp_verified")
        .eq("id", doctor_id)
        .single();

      if (docError || !doctor) {
        results.push({
          doctor_id,
          success: false,
          error: "Doctor not found",
        });
        continue;
      }

      if (!doctor.whatsapp_verified) {
        results.push({
          doctor_id,
          success: false,
          error: "Doctor phone not verified for WhatsApp",
        });
        continue;
      }

      try {
        // Create send log entry
        const { data: sendLog, error: logError } = await supabase
          .from("send_logs")
          .insert({
            doctor_id,
            custom_message,
            status: "pending",
          })
          .select()
          .single();

        if (logError) throw logError;

        // Get media files if any
        let mediaUrls: string[] = [];
        if (file_ids && file_ids.length > 0) {
          const { data: files, error: filesError } = await supabase
            .from("result_files")
            .select("storage_path")
            .in("id", file_ids);

          if (filesError) throw filesError;

          // Generate public URLs for Twilio to download files
          mediaUrls = (files || []).map((f) => {
            const publicUrl = supabase.storage
              .from("results")
              .getPublicUrl(f.storage_path).data.publicUrl;
            return publicUrl;
          });
        }

        // Send via WhatsApp (mock for now)
        const messageId = await sendViaWhatsApp(
          doctor.phone,
          custom_message,
          mediaUrls,
        );

        // Update send log with message ID and sent status
        const { error: updateError } = await supabase
          .from("send_logs")
          .update({
            status: "sent",
            twilio_message_sid: messageId,
            sent_at: new Date().toISOString(),
          })
          .eq("id", sendLog.id);

        if (updateError) throw updateError;

        results.push({
          doctor_id,
          send_log_id: sendLog.id,
          success: true,
          message_id: messageId,
        });
      } catch (error) {
        console.error(`Error sending to doctor ${doctor_id}:`, error);
        results.push({
          doctor_id,
          success: false,
          error: String(error),
        });
      }
    }

    res.json({ results });
  } catch (error) {
    console.error("Error sending results:", error);
    res.status(500).json({ error: "Failed to send results" });
  }
};

export const getSendLogs: RequestHandler = async (req, res) => {
  try {
    const { doctor_id, status, limit = 50, offset = 0 } = req.query;

    let query = supabase
      .from("send_logs")
      .select("*, doctors(name, phone)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (doctor_id) {
      query = query.eq("doctor_id", doctor_id);
    }

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    res.json({
      logs: data || [],
      total: count || 0,
      limit: Number(limit),
      offset: Number(offset),
    });
  } catch (error) {
    console.error("Error fetching send logs:", error);
    res.status(500).json({ error: "Failed to fetch send logs" });
  }
};

export const webhookTwilio: RequestHandler = async (req, res) => {
  try {
    // Handle Twilio webhook for message status updates
    const { MessageSid, MessageStatus } = req.body;

    if (!MessageSid) {
      return res.status(400).json({ error: "MessageSid is required" });
    }

    // Map Twilio status to our status
    const statusMap: Record<string, string> = {
      sent: "sent",
      delivered: "delivered",
      read: "read",
      failed: "failed",
      undelivered: "failed",
    };

    const mappedStatus = statusMap[MessageStatus] || MessageStatus;

    // Update send log
    const updateData: any = { status: mappedStatus };

    if (mappedStatus === "sent") {
      updateData.sent_at = new Date().toISOString();
    } else if (mappedStatus === "delivered") {
      updateData.delivered_at = new Date().toISOString();
    } else if (mappedStatus === "read") {
      updateData.read_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("send_logs")
      .update(updateData)
      .eq("twilio_message_sid", MessageSid);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error("Error handling Twilio webhook:", error);
    res.status(500).json({ error: "Failed to process webhook" });
  }
};
