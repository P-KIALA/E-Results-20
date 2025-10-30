import { RequestHandler } from "express";
import twilio from "twilio";
import { supabase } from "../lib/supabase";
import { SendResultsRequest } from "@shared/api";
import { validateAndFormatPhone, checkWhatsAppAvailability } from "../lib/phone";
import { sendViaNotifyer } from "../lib/notifyer";
import { sendViaInfobip } from "../lib/infobip";

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
  const useInfobip = !!process.env.INFOBIP_API_KEY && process.env.USE_INFOBIP !== "false";
  const useNotifyer = !!process.env.NOTIFYER_API_KEY && process.env.USE_NOTIFYER !== "false";

  if (useInfobip) {
    try {
      const id = await sendViaInfobip(to, message, mediaUrls);
      console.log(`Infobip sent message to ${to}: ${id}`);
      return id;
    } catch (error) {
      try {
        console.error(`Infobip send error for ${to}:`, {
          message: (error as any)?.message,
          stack: (error as any)?.stack,
          details: JSON.stringify(error, Object.getOwnPropertyNames(error)),
        });
      } catch (e) {
        console.error(`Infobip send error for ${to}:`, error);
      }
      // fallthrough to other providers
      console.warn("Falling back from Infobip to other provider");
    }
  }

  if (useNotifyer) {
    try {
      const id = await sendViaNotifyer(to, message, mediaUrls);
      console.log(`Notifyer sent message to ${to}: ${id}`);
      return id;
    } catch (error) {
      try {
        console.error(`Notifyer send error for ${to}:`, {
          message: (error as any)?.message,
          stack: (error as any)?.stack,
          details: JSON.stringify(error, Object.getOwnPropertyNames(error)),
        });
      } catch (e) {
        console.error(`Notifyer send error for ${to}:`, error);
      }
      // Fallback to Twilio if notifyer fails
      console.warn("Falling back to Twilio for message delivery");
    }
  }

  try {
    // WhatsApp via Twilio supports one media per message reliably.
    // If multiple media are provided, send the first media with the message body,
    // then send each remaining media as a separate message (without body).

    const statusCallbackUrl = process.env.APP_BASE_URL
      ? `${process.env.APP_BASE_URL.replace(/\/$/, "")}/api/webhook/twilio`
      : process.env.TWILIO_STATUS_CALLBACK_URL || undefined;

    if (!mediaUrls || mediaUrls.length === 0) {
      const msgParams: any = {
        from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
        to: `whatsapp:${to}`,
        body: message,
      };
      if (statusCallbackUrl) msgParams.statusCallback = statusCallbackUrl;

      const result = await twilioClient.messages.create(msgParams);

      console.log(`Message sent successfully to ${to}: ${result.sid}`);
      return result.sid;
    }

    // Send first message with body + first media
    const firstParams: any = {
      from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
      to: `whatsapp:${to}`,
      body: message,
      mediaUrl: [mediaUrls[0]],
    };
    if (statusCallbackUrl) firstParams.statusCallback = statusCallbackUrl;

    const firstResult = await twilioClient.messages.create(firstParams);
    console.log(`Message with first media sent to ${to}: ${firstResult.sid}`);

    // Send remaining media as separate messages
    for (let i = 1; i < mediaUrls.length; i++) {
      try {
        const msgParams: any = {
          from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
          to: `whatsapp:${to}`,
          mediaUrl: [mediaUrls[i]],
        };
        if (statusCallbackUrl) msgParams.statusCallback = statusCallbackUrl;

        const res = await twilioClient.messages.create(msgParams);
        console.log(`Additional media ${i + 1} sent to ${to}: ${res.sid}`);
      } catch (err) {
        try {
          console.error(`Failed to send media #${i + 1} to ${to}:`, {
            message: err?.message,
            stack: err?.stack,
            details: JSON.stringify(err, Object.getOwnPropertyNames(err)),
          });
        } catch (e) {
          console.error(`Failed to send media #${i + 1} to ${to}:`, err);
        }
      }
    }

    return firstResult.sid;
  } catch (error) {
    try {
      console.error(`Error sending WhatsApp message to ${to}:`, {
        message: error?.message,
        stack: error?.stack,
        details: JSON.stringify(error, Object.getOwnPropertyNames(error)),
      });
    } catch (e) {
      console.error(`Error sending WhatsApp message to ${to}:`, error);
    }
    throw error;
  }
}

export const sendResults: RequestHandler = async (req, res) => {
  try {
    const { doctor_ids: incomingDoctorIds, custom_message, file_ids, extra_numbers } =
      req.body as SendResultsRequest;

    // Normalize doctor_ids to a mutable array
    const doctor_ids = Array.isArray(incomingDoctorIds) ? [...incomingDoctorIds] : [];

    // Note: patient_name field may not be present in DB schema yet in some environments.
    // To avoid blocking message sending while migrations propagate, do not enforce it server-side.
    const patient_name = (req.body as any).patient_name;

    if (!doctor_ids || doctor_ids.length === 0 || !custom_message) {
      return res
        .status(400)
        .json({ error: "doctor_ids and custom_message are required" });
    }

    const results: any[] = [];

    // If extra_numbers provided, try to resolve them to doctor IDs (find existing doctor by phone or create one)
    if (extra_numbers && Array.isArray(extra_numbers) && extra_numbers.length > 0) {
      for (const rawPhone of extra_numbers) {
        try {
          const validation = validateAndFormatPhone(String(rawPhone));
          if (!validation.is_valid) {
            console.warn(`Skipping invalid phone: ${rawPhone}`);
            continue;
          }
          const formatted = validation.formatted_phone;

          // Try to find existing doctor
          const { data: existing, error: findErr } = await supabase
            .from("doctors")
            .select("id")
            .eq("phone", formatted)
            .single();

          if (findErr) {
            console.warn(`Error looking up doctor for ${formatted}:`, findErr);
          }

          if (existing && existing.id) {
            doctor_ids.push(existing.id);
          } else {
            // Create a lightweight doctor record for this number
            const is_whatsapp = await checkWhatsAppAvailability(formatted);
            const { data: newDoc, error: insertErr } = await supabase
              .from("doctors")
              .insert({
                phone: formatted,
                name: formatted,
                whatsapp_verified: is_whatsapp,
                whatsapp_verified_at: is_whatsapp ? new Date().toISOString() : null,
              })
              .select()
              .single();

            if (insertErr) {
              console.warn(`Failed to create doctor for ${formatted}:`, insertErr);
            } else if (newDoc && newDoc.id) {
              doctor_ids.push(newDoc.id);
            }
          }
        } catch (e) {
          console.error(`Error resolving extra number ${rawPhone}:`, e);
        }
      }
    }

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
        // Get sender user info for site context
        let senderSiteId = null;
        if ((req as any).userId) {
          const { data: senderUser } = await supabase
            .from("users")
            .select("primary_site_id")
            .eq("id", (req as any).userId)
            .single();
          senderSiteId = senderUser?.primary_site_id || null;
        }

        // Create send log entry
        const { data: sendLog, error: logError } = await supabase
          .from("send_logs")
          .insert({
            doctor_id,
            custom_message,
            patient_name: patient_name || null,
            patient_site: (req.body as any).patient_site || null,
            sender_id: (req as any).userId || null,
            status: "pending",
          })
          .select()
          .single();

        if (logError) {
          try {
            console.warn("send_logs insert encountered error:", {
              message: logError?.message,
              stack: logError?.stack,
              details: JSON.stringify(logError, Object.getOwnPropertyNames(logError)),
            });
          } catch (e) {
            console.warn("send_logs insert encountered error:", logError);
          }
          throw logError;
        }

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
        try {
          console.error(`Error sending to doctor ${doctor_id}:`, {
            message: error?.message,
            stack: error?.stack,
            details: JSON.stringify(error, Object.getOwnPropertyNames(error)),
          });
        } catch (e) {
          console.error(`Error sending to doctor ${doctor_id}:`, error);
        }
        results.push({
          doctor_id,
          success: false,
          error: String(error),
        });
      }
    }

    res.json({ results });
  } catch (error) {
    try {
      console.error("Error sending results:", {
        message: error?.message,
        stack: error?.stack,
        details: JSON.stringify(error, Object.getOwnPropertyNames(error)),
      });
    } catch (e) {
      console.error("Error sending results:", error);
    }
    res.status(500).json({ error: error?.message || "Failed to send results" });
  }
};

export const getSendLogs: RequestHandler = async (req, res) => {
  try {
    const {
      doctor_id,
      status,
      site_id,
      startDate,
      endDate,
      limit = 50,
      offset = 0,
    } = req.query;
    const userId = (req as any).userId;

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

    // Filter by site - match against patient_site
    if (site_id) {
      // First get the site name
      const { data: site } = await supabase
        .from("sites")
        .select("name")
        .eq("id", site_id)
        .single();

      if (site) {
        query = query.eq("patient_site", site.name);
      }
    }

    // Debug incoming query params to help diagnose issues
    try {
      console.log("getSendLogs - query params:", JSON.stringify(req.query));
    } catch (_) {}

    // Filter by sender (user who sent the message)
    const senderParam = req.query.sender_id;
    if (senderParam) {
      if (Array.isArray(senderParam)) {
        // If multiple sender_id provided, filter by any of them
        const senderIds = senderParam.map((s) => String(s));
        query = query.in("sender_id", senderIds);
      } else {
        query = query.eq("sender_id", String(senderParam));
      }
    }

    // Filter by date range
    if (startDate) {
      query = query.gte("created_at", startDate as string);
    }

    if (endDate) {
      // Add one day to endDate to include the entire end date
      const endDateObj = new Date(endDate as string);
      endDateObj.setDate(endDateObj.getDate() + 1);
      query = query.lt("created_at", endDateObj.toISOString());
    }

    const { data, error, count } = await query;

    if (error) throw error;

    const logs = data || [];

    // Attach sender user info (email, site, primary_site) for each log
    const senderIds = Array.from(
      new Set(logs.map((l: any) => l.sender_id).filter(Boolean)),
    );
    let sendersMap: Record<string, any> = {};
    if (senderIds.length > 0) {
      const { data: senders } = await supabase
        .from("users")
        .select("id, email, primary_site_id")
        .in("id", senderIds as string[]);

      // Fetch sites for the senders
      const siteIds = (senders || [])
        .map((s: any) => s.primary_site_id)
        .filter(Boolean);
      let sitesMap: Record<string, any> = {};
      if (siteIds.length > 0) {
        const { data: sites } = await supabase
          .from("sites")
          .select("id, name")
          .in("id", siteIds as string[]);
        (sites || []).forEach((s: any) => (sitesMap[s.id] = s));
      }

      (senders || []).forEach((s: any) => {
        sendersMap[s.id] = {
          email: s.email,
          site: s.primary_site_id ? sitesMap[s.primary_site_id]?.name : null,
        };
      });
    }

    const logsWithSender = (logs || []).map((l: any) => ({
      ...l,
      sender: l.sender_id ? sendersMap[l.sender_id] || null : null,
    }));

    res.json({
      logs: logsWithSender,
      total: count || 0,
      limit: Number(limit),
      offset: Number(offset),
    });
  } catch (error: any) {
    try {
      console.error("Error fetching send logs:", error, {
        message: error?.message,
        stack: error?.stack,
        details: JSON.stringify(error, Object.getOwnPropertyNames(error)),
      });
    } catch (e) {
      console.error("Error fetching send logs (failed to stringify):", error);
    }
    res
      .status(500)
      .json({ error: error?.message || "Failed to fetch send logs" });
  }
};

export const webhookTwilio: RequestHandler = async (req, res) => {
  try {
    // Handle Twilio webhook for message status updates
    const { MessageSid, MessageStatus, ErrorCode, ErrorMessage } = req.body;

    if (!MessageSid) {
      return res.status(400).json({ error: "MessageSid is required" });
    }

    console.log(
      `Twilio webhook: MessageSid=${MessageSid}, Status=${MessageStatus}, ErrorCode=${ErrorCode}, ErrorMessage=${ErrorMessage}`,
    );

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

    // Store error message if available
    if (ErrorMessage) {
      updateData.error_message = `${ErrorCode}: ${ErrorMessage}`;
    }

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
    try {
      console.error("Error handling Twilio webhook:", {
        message: error?.message,
        stack: error?.stack,
        details: JSON.stringify(error, Object.getOwnPropertyNames(error)),
      });
    } catch (e) {
      console.error("Error handling Twilio webhook:", error);
    }
    res.status(500).json({ error: error?.message || "Failed to process webhook" });
  }
};

export const webhookInfobip: RequestHandler = async (req, res) => {
  try {
    // Infobip delivery callbacks structure can vary. We'll try to extract common fields.
    const body = req.body;
    console.log("Infobip webhook payload:", JSON.stringify(body));

    // Common fields: messageId, status, or results array
    let messageId: string | undefined;
    let status: string | undefined;

    if (body.messageId) {
      messageId = body.messageId;
    } else if (body.messages && Array.isArray(body.messages) && body.messages[0]) {
      messageId = body.messages[0].messageId || body.messages[0].id || body.messages[0].messageId;
      status = body.messages[0].status?.name || body.messages[0].status;
    } else if (body.results && Array.isArray(body.results) && body.results[0]) {
      messageId = body.results[0].messageId || body.results[0].bulkId || body.results[0].id;
      status = body.results[0].status || body.results[0].statusName;
    }

    if (!messageId) {
      console.warn("Infobip webhook: could not find message id in payload");
      return res.json({ success: true });
    }

    // Map Infobip status to our status
    const map: Record<string, string> = {
      PENDING: "pending",
      SCHEDULED: "pending",
      SENT: "sent",
      DELIVERED: "delivered",
      READ: "read",
      UNDELIVERABLE: "failed",
      FAILED: "failed",
    };

    const mapped = status ? map[status.toUpperCase()] || status : "sent";

    const updateData: any = { status: mapped };
    if (mapped === "sent") updateData.sent_at = new Date().toISOString();
    if (mapped === "delivered") updateData.delivered_at = new Date().toISOString();
    if (mapped === "read") updateData.read_at = new Date().toISOString();

    // Update send_logs where twilio_message_sid equals messageId (we store provider ids there)
    const { error } = await supabase
      .from("send_logs")
      .update(updateData)
      .eq("twilio_message_sid", messageId);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error("Error handling Infobip webhook:", error);
    res.status(500).json({ error: "Failed to process infobip webhook" });
  }
};
