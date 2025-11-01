import { RequestHandler } from "express";
import { supabase } from "../lib/supabase";
import dotenv from "dotenv";
import path from "path";
// Ensure .env is loaded (in case env vars were modified at runtime)
try {
  dotenv.config({ path: path.resolve(process.cwd(), ".env"), override: true });
} catch (_) {}
import { SendResultsRequest } from "@shared/api";
import {
  validateAndFormatPhone,
  checkWhatsAppAvailability,
} from "../lib/phone";
// Twilio send implementation with retries, validation and friendly errors
async function sendViaWhatsApp(
  to: string,
  message: string,
  mediaUrls: string[],
  creds?: {
    sid?: string;
    token?: string;
    messagingService?: string;
    from?: string;
    statusCallback?: string;
  },
  template?: { contentSid?: string; variables?: Record<string, any> },
): Promise<string> {
  // Validate recipient phone
  const validation = validateAndFormatPhone(String(to));
  if (!validation.is_valid) throw new Error("Invalid phone number format");
  const toWhats = to.startsWith("whatsapp:")
    ? to
    : `whatsapp:${validation.formatted_phone}`;

  // Credentials
  const sid = creds?.sid || process.env.TWILIO_ACCOUNT_SID;
  const token = creds?.token || process.env.TWILIO_AUTH_TOKEN;
  const messagingService =
    creds?.messagingService || process.env.TWILIO_MESSAGING_SERVICE_SID;
  const fromEnv = creds?.from || process.env.TWILIO_PHONE_NUMBER;

  if (!sid || !token) throw new Error("Twilio credentials not configured");

  // Status callback (so Twilio will POST delivery updates)
  const statusCallback =
    creds?.statusCallback || process.env.TWILIO_STATUS_CALLBACK_URL;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;

  // Build payload depending on whether we're sending a template
  const buildPayload = (useMessagingService: boolean) => {
    const payload = new URLSearchParams();
    payload.append("To", toWhats);

    if (useMessagingService && messagingService)
      payload.append("MessagingServiceSid", messagingService);
    else if (fromEnv)
      payload.append(
        "From",
        fromEnv.startsWith("whatsapp:") ? fromEnv : `whatsapp:${fromEnv}`,
      );

    // If a template ContentSid is provided, use ContentSid + ContentVariables
    if (template && template.contentSid) {
      payload.append("ContentSid", template.contentSid);
      const vars = template.variables || {};
      // Ensure custom_message is available to templates (map to 'body' if not provided)
      if (!vars.body && message) {
        vars.body = message;
      }

      // If mediaUrls provided and template expects a media variable, include them in variables.
      // Some WhatsApp templates reference media via indexed placeholders like {{1}}, so we map each URL to numeric keys starting at "1".
      if (mediaUrls && mediaUrls.length > 0) {
        // also provide media_urls as a comma-separated string for templates expecting a single variable
        vars.media_urls = mediaUrls.map((m) => String(m)).join(", ");
        mediaUrls.forEach((m, idx) => {
          // Twilio templates may reference {{1}}, {{2}}, ... — map accordingly
          vars[String(idx + 1)] = String(m);
        });
      }

      // Sanitize variables: Twilio expects primitive values (strings/numbers). Convert objects/arrays to strings.
      const sanitizedVars: Record<string, any> = {};
      for (const k of Object.keys(vars)) {
        const v = (vars as any)[k];
        if (v === null || v === undefined) {
          sanitizedVars[k] = null;
        } else if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
          sanitizedVars[k] = v;
        } else if (Array.isArray(v)) {
          // Join arrays with comma — templates should handle this as plain text
          sanitizedVars[k] = v.map((x) => (x === null || x === undefined ? "" : String(x))).join(", ");
        } else {
          // For objects, stringify to avoid sending complex nested types
          try {
            sanitizedVars[k] = JSON.stringify(v);
          } catch (e) {
            sanitizedVars[k] = String(v);
          }
        }
      }

      payload.append("ContentVariables", JSON.stringify(sanitizedVars));
    } else {
      // Free-form body + media (subject to 24h window)
      payload.append("Body", message);
      if (mediaUrls && mediaUrls.length > 0) {
        for (const m of mediaUrls) payload.append("MediaUrl", m);
      }
    }

    if (statusCallback) payload.append("StatusCallback", statusCallback);

    return payload.toString();
  };

  // Retry logic
  const maxRetries = 2;
  let attempt = 0;
  let lastError: any = null;

  while (attempt <= maxRetries) {
    try {
      const useMessagingService = !!messagingService;
      const body = buildPayload(useMessagingService);

      // Debug logging: payload and metadata (do not log secrets)
      try {
        const redactedHeaders = {
          Authorization: "REDACTED",
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        };
        console.log("[Twilio DEBUG] Sending payload", {
          url,
          attempt,
          useMessagingService,
          template: Boolean(template && template.contentSid),
          body_preview: body.length > 1000 ? body.slice(0, 1000) + "..." : body,
          headers: redactedHeaders,
        });
      } catch (e) {
        // ignore logging errors
      }

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
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      parsed = { raw: text };
    }

    // Log Twilio response for debugging
    try {
      console.log("[Twilio DEBUG] Response", { status: resp.status, parsed });
    } catch (e) {}

      if (!resp.ok) {
        const twErr = parsed || {};
        const code = twErr.code || twErr.error_code || null;
        const msg =
          twErr.message ||
          twErr.error_message ||
          twErr.more_info ||
          JSON.stringify(parsed);

        // For known WhatsApp 63016 (template required), surface friendly message
        if (
          code === 63016 ||
          (typeof msg === "string" && msg.includes("window"))
        ) {
          throw new Error(
            `WhatsApp template/window error${code ? " " + code : ""}: ${msg}`,
          );
        }

        // 4xx -> don't retry
        if (resp.status >= 400 && resp.status < 500) {
          throw new Error(`Twilio error${code ? " " + code : ""}: ${msg}`);
        }

        lastError = new Error(`Twilio error ${resp.status}: ${msg}`);
        attempt++;
        await new Promise((r) => setTimeout(r, 500 * attempt));
        continue;
      }

      const sidResp = parsed?.sid || parsed?.message_id || null;
      if (!sidResp)
        return parsed?.sid || parsed?.message_id || JSON.stringify(parsed);
      return sidResp;
    } catch (err) {
      lastError = err;
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

        // Get media files if any (include id so we can attach them to send_logs)
        let mediaFiles: {
          id: string;
          storage_path: string;
          publicUrl: string;
        }[] = [];
        if (file_ids && file_ids.length > 0) {
          const { data: files, error: filesError } = await supabase
            .from("result_files")
            .select("id, storage_path")
            .in("id", file_ids);

          if (filesError) throw filesError;

          // Generate public URLs for providers to download files
          mediaFiles = (files || []).map((f: any) => {
            const publicUrl = supabase.storage
              .from("results")
              .getPublicUrl(f.storage_path).data.publicUrl;
            return { id: f.id, storage_path: f.storage_path, publicUrl };
          });
        }

        const twCreds = {
          sid: (req.body as any).twilio_sid || undefined,
          token: (req.body as any).twilio_token || undefined,
          messagingService:
            (req.body as any).twilio_messaging_service_sid || undefined,
          from: (req.body as any).twilio_from || undefined,
          statusCallback: (req.body as any).twilio_status_callback || undefined,
        };

        // Prefer using a pre-approved WhatsApp template when available (to avoid 63016)
        // Accept multiple template SIDs (comma-separated string or array) and try them in order.
        const rawTemplateSid = (req.body as any).template_content_sid || process.env.WHATSAPP_TEMPLATE_CONTENT_SID;
        const templateCandidates: string[] = [];
        if (rawTemplateSid) {
          if (Array.isArray(rawTemplateSid)) {
            rawTemplateSid.forEach((s: any) => {
              if (s) templateCandidates.push(String(s).trim());
            });
          } else if (typeof rawTemplateSid === "string") {
            String(rawTemplateSid)
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
              .forEach((s) => templateCandidates.push(s));
          }
        }
        const templateVars = (req.body as any).template_variables || undefined;

        // If attached files include PDFs, prefer sending as MediaUrl (document) via free-form message
        const hasPdf = mediaFiles.some((m) => {
          const lc = String((m.storage_path || m.publicUrl || "")).toLowerCase();
          return lc.endsWith(".pdf") || lc.includes(".pdf");
        });

        // If we have multiple files and a template, send one message per file because many WhatsApp template headers
        // or providers accept a single document in the header. Sending multiple files in one templated message may result
        // in only the first being delivered. We therefore create a separate send_log and send for each file.
        // However, if files include PDFs and the template is not guaranteed to support document headers,
        // prefer sending free-form messages with MediaUrl so Twilio attaches the PDF itself.
        if (templateCandidates.length > 0 && mediaFiles.length > 1 && !hasPdf) {
          for (const mf of mediaFiles) {
            // Create a send_log per file
            const { data: insertedLog, error: logErr } = await supabase
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

            const currentSendLogId = insertedLog?.id || null;

            try {
              let messageId: any = null;
              // Try each candidate template SID in order; if none succeed, fallback to free-form
              if (templateCandidates.length > 0) {
                let lastErr: any = null;
                for (const candidateSid of templateCandidates) {
                  try {
                    messageId = await sendViaWhatsApp(
                      doctor.phone,
                      custom_message,
                      [mf.publicUrl],
                      twCreds,
                      {
                        contentSid: candidateSid,
                        variables: templateVars || {
                          doctor_name: doctor.name,
                          patient_name,
                        },
                      },
                    );
                    // success
                    break;
                  } catch (templateErr: any) {
                    lastErr = templateErr;
                    const msg = String(templateErr?.message || templateErr);
                    // If this candidate failed due to template/window, try next candidate
                    if (msg.includes("template") || msg.includes("window") || msg.includes("63016") || msg.includes("ContentVariables")) {
                      continue;
                    }
                    // Unexpected error -> rethrow
                    throw templateErr;
                  }
                }

                // If none of the template candidates worked, fallback to free-form send
                if (!messageId) {
                  try {
                    messageId = await sendViaWhatsApp(
                      doctor.phone,
                      custom_message,
                      [mf.publicUrl],
                      twCreds,
                      undefined,
                    );
                  } catch (retryErr) {
                    throw retryErr;
                  }
                }
              } else {
                // No template candidates -> send free-form
                messageId = await sendViaWhatsApp(
                  doctor.phone,
                  custom_message,
                  [mf.publicUrl],
                  twCreds,
                  undefined,
                );
              }

              // Update send log with message ID and sent status
              await supabase
                .from("send_logs")
                .update({
                  status: "sent",
                  sent_at: new Date().toISOString(),
                  provider_message_id: messageId,
                })
                .eq("id", currentSendLogId);

              // Attach this file record to this send_log
              try {
                await supabase
                  .from("result_files")
                  .update({ send_log_id: currentSendLogId })
                  .eq("id", mf.id);
              } catch (e) {
                console.warn("Failed to attach file to send_log", e);
              }

              results.push({
                doctor_id,
                send_log_id: currentSendLogId,
                success: true,
                message_id: messageId,
                file_id: mf.id,
              });
            } catch (err) {
              // Mark send_log failed
              await supabase
                .from("send_logs")
                .update({ status: "failed", error_message: String(err) })
                .eq("id", currentSendLogId);
              results.push({
                doctor_id,
                send_log_id: currentSendLogId,
                success: false,
                error: String(err),
                file_id: mf.id,
              });
            }
          }

          // Skip the rest of the loop since we've processed files
          continue;
        }

        // Otherwise send as single message (default behavior)
        const mediaUrls = mediaFiles.map((f) => f.publicUrl);

        let messageId: any = null;
        try {
          const useTemplate = Boolean(templateCandidates.length > 0 && !hasPdf);
          if (useTemplate) {
            // Try candidates in order
            let lastErr: any = null;
            for (const candidateSid of templateCandidates) {
              try {
                messageId = await sendViaWhatsApp(
                  doctor.phone,
                  custom_message,
                  mediaUrls,
                  twCreds,
                  {
                    contentSid: candidateSid,
                    variables: templateVars || {
                      doctor_name: doctor.name,
                      patient_name,
                    },
                  },
                );
                break;
              } catch (templateErr: any) {
                lastErr = templateErr;
                const msg = String(templateErr?.message || templateErr);
                if (msg.includes("template") || msg.includes("window") || msg.includes("63016") || msg.includes("ContentVariables")) {
                  continue; // try next candidate
                }
                throw templateErr;
              }
            }

            // If no template candidate succeeded, fallback to free-form
            if (!messageId) {
              messageId = await sendViaWhatsApp(
                doctor.phone,
                custom_message,
                mediaUrls,
                twCreds,
                undefined,
              );
            }
          } else {
            // Not using template => free-form
            messageId = await sendViaWhatsApp(
              doctor.phone,
              custom_message,
              mediaUrls,
              twCreds,
              undefined,
            );
          }
        } catch (templateErr: any) {
          const msg = String(templateErr?.message || templateErr);
          if (msg.includes("template") || msg.includes("window") || msg.includes("63016")) {
            // Retry without template
            messageId = await sendViaWhatsApp(
              doctor.phone,
              custom_message,
              mediaUrls,
              twCreds,
              undefined,
            );
          } else {
            throw templateErr;
          }
        }

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

        // If we attached files, link them to the send_log
        if (mediaFiles.length > 0) {
          try {
            await supabase
              .from("result_files")
              .update({ send_log_id: sendLogId })
              .in(
                "id",
                mediaFiles.map((m) => m.id),
              );
          } catch (e) {
            console.warn("Failed to attach files to send_log:", e);
          }
        }

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

// Get files associated with a send_log
export const getSendLogFiles: RequestHandler = async (req, res) => {
  try {
    console.log(
      `[getSendLogFiles] incoming request path=${req.path} params=${JSON.stringify(req.params)} query=${JSON.stringify(req.query)} origin=${req.headers.origin || req.headers.referer || "<no-origin>"} auth=${req.headers.authorization ? "present" : "missing"}`,
    );
    const sendLogId = req.params.id || req.query.send_log_id;
    if (!sendLogId)
      return res.status(400).json({ error: "send_log_id is required" });

    // Primary: files explicitly linked to send_log
    const { data, error } = await supabase
      .from("result_files")
      .select("id, file_name, storage_path, created_at")
      .eq("send_log_id", String(sendLogId));

    if (error) throw error;

    let files = data || [];

    // If no files attached, attempt a best-effort fallback: find recent unlinked files
    // created around the send_log creation time (±5 minutes).
    if (!files || files.length === 0) {
      try {
        const { data: sendLog } = await supabase
          .from("send_logs")
          .select("id, created_at")
          .eq("id", String(sendLogId))
          .single();

        if (sendLog && sendLog.created_at) {
          const createdAt = new Date(sendLog.created_at);
          const from = new Date(
            createdAt.getTime() - 5 * 60 * 1000,
          ).toISOString();
          const to = new Date(
            createdAt.getTime() + 5 * 60 * 1000,
          ).toISOString();

          const { data: fallbackFiles, error: fbErr } = await supabase
            .from("result_files")
            .select("id, file_name, storage_path, created_at")
            .is("send_log_id", null)
            .gte("created_at", from)
            .lte("created_at", to);

          if (!fbErr && fallbackFiles && fallbackFiles.length > 0) {
            files = fallbackFiles;
            console.warn(
              `getSendLogFiles: using fallback ${fallbackFiles.length} files for send_log ${sendLogId}`,
            );
          }
        }
      } catch (e) {
        console.warn("getSendLogFiles: fallback query failed", e);
      }
    }

    console.log(
      `[getSendLogFiles] returning ${(files || []).length} files for send_log ${String(sendLogId)}`,
    );
    res.json({ files: files || [] });
  } catch (error: any) {
    console.error("Error fetching send log files:", error);
    res.status(500).json({ error: error?.message || "Failed to fetch files" });
  }
};
