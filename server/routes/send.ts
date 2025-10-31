import { RequestHandler } from "express";
import { supabase } from "../lib/supabase";
import { SendResultsRequest } from "@shared/api";
import {
  validateAndFormatPhone,
  checkWhatsAppAvailability,
} from "../lib/phone";
// Twilio send implementation with retries, validation and friendly errors
async function sendViaWhatsApp(to: string, message: string, mediaUrls: string[], creds?: { sid?: string; token?: string; messagingService?: string; from?: string }): Promise<string> {
  // Validate to
  const validation = validateAndFormatPhone(String(to));
  if (!validation.is_valid) throw new Error("Invalid phone number format");
  const toWhats = to.startsWith("whatsapp:") ? to : `whatsapp:${validation.formatted_phone}`;

  // Credentials
  const sid = creds?.sid || process.env.TWILIO_ACCOUNT_SID;
  const token = creds?.token || process.env.TWILIO_AUTH_TOKEN;
  const messagingService = creds?.messagingService || process.env.TWILIO_MESSAGING_SERVICE_SID;
  const fromEnv = creds?.from || process.env.TWILIO_PHONE_NUMBER;

  if (!sid || !token) throw new Error("Twilio credentials not configured");

  // Build payload
  const buildPayload = (useMessagingService: boolean) => {
    const payload = new URLSearchParams();
    payload.append("To", toWhats);
    if (useMessagingService && messagingService) payload.append("MessagingServiceSid", messagingService);
    else if (fromEnv) payload.append("From", fromEnv.startsWith("whatsapp:") ? fromEnv : `whatsapp:${fromEnv}`);
    payload.append("Body", message);
    if (mediaUrls && mediaUrls.length > 0) {
      for (const m of mediaUrls) payload.append("MediaUrl", m);
    }
    return payload.toString();
  };

  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;

  // Retry logic for transient errors
  const maxRetries = 2;
  let attempt = 0;
  let lastError: any = null;
  while (attempt <= maxRetries) {
    try {
      const useMessagingService = !!messagingService;
      const body = buildPayload(useMessagingService);
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body,
      });

      const text = await resp.text();
      let parsed: any = null;
      try { parsed = JSON.parse(text); } catch (e) { parsed = { raw: text }; }

      if (!resp.ok) {
        // Twilio error: provide friendly message including Twilio error code/message
        const twErr = parsed || {};
        const code = twErr.code || twErr.error_code || null;
        const msg = twErr.message || twErr.error_message || twErr.more_info || JSON.stringify(parsed);
        // If 4xx and not auth, don't retry
        if (resp.status >= 400 && resp.status < 500) {
          throw new Error(`Twilio error${code ? ' ' + code : ''}: ${msg}`);
        }
        // 5xx: mark for retry
        lastError = new Error(`Twilio error ${resp.status}: ${msg}`);
        attempt++;
        await new Promise((r) => setTimeout(r, 500 * attempt));
        continue;
      }

      // Success: Twilio returns sid
      const sidResp = parsed?.sid || parsed?.message_id || null;
      if (!sidResp) return parsed?.sid || parsed?.message_id || JSON.stringify(parsed);
      return sidResp;
    } catch (err) {
      lastError = err;
      // Network or unexpected error -> retry a couple times
      attempt++;
      if (attempt > maxRetries) break;
      await new Promise((r) => setTimeout(r, 500 * attempt));
    }
  }

  throw lastError || new Error("Failed to send message via Twilio");
}

export const sendResults: RequestHandler = async (req, res) => {
  try {
    const {
      doctor_ids: incomingDoctorIds,
      custom_message,
      file_ids,
      extra_numbers,
    } = req.body as SendResultsRequest;

    // Normalize doctor_ids to a mutable array
    const doctor_ids = Array.isArray(incomingDoctorIds)
      ? [...incomingDoctorIds]
      : [];

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
    if (
      extra_numbers &&
      Array.isArray(extra_numbers) &&
      extra_numbers.length > 0
    ) {
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
                whatsapp_verified_at: is_whatsapp
                  ? new Date().toISOString()
                  : null,
              })
              .select()
              .single();

            if (insertErr) {
              console.warn(
                `Failed to create doctor for ${formatted}:`,
                insertErr,
              );
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
        let sendLog: any = null;
        let sendLogId: string | null = null;
        const { data: inserted, error: logError } = await supabase
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
              details: JSON.stringify(
                logError,
                Object.getOwnPropertyNames(logError),
              ),
            });
          } catch (e) {
            console.warn("send_logs insert encountered error:", logError);
          }
          throw logError;
        }

        sendLog = inserted;
        sendLogId = inserted?.id || null;

        // Get media files if any
        let mediaUrls: string[] = [];
        if (file_ids && file_ids.length > 0) {
          const { data: files, error: filesError } = await supabase
            .from("result_files")
            .select("storage_path")
            .in("id", file_ids);

          if (filesError) throw filesError;

          // Generate public URLs for providers to download files
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
            sent_at: new Date().toISOString(),
            provider_message_id: messageId,
          })
          .eq("id", sendLogId);

        if (updateError) throw updateError;

        results.push({
          doctor_id,
          send_log_id: sendLogId,
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

        // Determine friendly error message
        const errorMessage =
          error && (error.message || error.error)
            ? String(error.message || error.error)
            : String(error);

        // Mark send_log as failed with error message if we have a sendLogId
        try {
          if (sendLogId) {
            await supabase
              .from("send_logs")
              .update({ status: "failed", error_message: errorMessage })
              .eq("id", sendLogId);
          }
        } catch (updateErr) {
          console.error(
            "Failed to update send_log status to failed:",
            updateErr,
          );
        }

        results.push({
          doctor_id,
          success: false,
          error: errorMessage,
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
