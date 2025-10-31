import { RequestHandler } from "express";
import { supabase } from "../lib/supabase";
import { validateAndFormatPhone } from "../lib/phone";

// Generic debug endpoint
export const debugInfo: RequestHandler = async (_req, res) => {
  try {
    res.json({
      success: true,
      message: "Debug endpoints active.",
    });
  } catch (error: any) {
    console.error("debugInfo error:", error);
    res
      .status(500)
      .json({ success: false, error: error?.message || String(error) });
  }
};

// Debug helper to simulate sending a result to a doctor without external provider.
// Accepts { doctor_id?, phone?, custom_message, file_ids?, patient_site?, patient_name? }
export const sendTest: RequestHandler = async (req, res) => {
  try {
    const {
      doctor_id: incomingDoctorId,
      phone,
      custom_message,
      file_ids,
      patient_site,
      patient_name,
    } = req.body as any;

    if (!incomingDoctorId && !phone) {
      return res.status(400).json({ error: "doctor_id or phone is required" });
    }

    if (!custom_message) {
      return res.status(400).json({ error: "custom_message is required" });
    }

    let doctorId = incomingDoctorId;
    // If phone provided and no doctor_id, find or create a doctor and mark as verified for simulation
    if (!doctorId && phone) {
      const validation = validateAndFormatPhone(String(phone));
      if (!validation.is_valid) {
        return res.status(400).json({ error: "Invalid phone format" });
      }
      const formatted = validation.formatted_phone;

      const { data: existing } = await supabase
        .from("doctors")
        .select("id")
        .eq("phone", formatted)
        .single();

      if (existing && existing.id) {
        doctorId = existing.id;
      } else {
        const { data: newDoc, error: insertErr } = await supabase
          .from("doctors")
          .insert({
            phone: formatted,
            name: formatted,
            whatsapp_verified: true,
            whatsapp_verified_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (insertErr) {
          console.error("Failed to create doctor in sendTest:", insertErr);
          return res.status(500).json({ error: "Failed to create doctor" });
        }
        doctorId = newDoc.id;
      }
    }

    // Create a send_log and mark as sent (simulate provider)
    const simulatedMessageId = `SIMULATED_${Date.now()}`;
    const { data: inserted, error: logError } = await supabase
      .from("send_logs")
      .insert({
        doctor_id: doctorId,
        custom_message,
        patient_name: patient_name || null,
        patient_site: patient_site || null,
        sender_id: (req as any).userId || null,
        status: "sent",
        sent_at: new Date().toISOString(),
        provider_message_id: simulatedMessageId,
      })
      .select()
      .single();

    if (logError) {
      console.error("sendTest send_logs insert error:", logError);
      return res.status(500).json({ error: "Failed to create send log" });
    }

    // Optionally attach files — just ensure relation exists if file_ids provided
    if (file_ids && Array.isArray(file_ids) && file_ids.length > 0) {
      try {
        await supabase
          .from("result_files")
          .update({ send_log_id: inserted.id })
          .in("id", file_ids);
      } catch (e) {
        console.warn("sendTest: failed to attach files to send_log", e);
      }
    }

    res.json({
      results: [
        {
          doctor_id: doctorId,
          send_log_id: inserted.id,
          success: true,
          message_id: inserted.twilio_message_sid,
        },
      ],
    });
  } catch (error: any) {
    console.error("sendTest error:", error);
    res.status(500).json({ error: error?.message || String(error) });
  }
};
