import { supabase } from "../lib/supabase";

export const getPatients: RequestHandler = async (_req, res) => {
  try {
    const { data, error } = await supabase.from("patients").select("*").order("created_at", { ascending: false });
    if (error) {
      if ((error as any).code === "PGRST205") {
        console.warn("patients table not found. Please run the migration scripts/migrations/006-add-patient-fields.sql on your database.");
        return res.json({ patients: [] });
      }
      throw error;
    }
    return res.json({ patients: data || [] });
  } catch (error) {
    console.error("Error fetching patients:", error);
    return res.status(500).json({ error: "Failed to fetch patients" });
  }
};

export const addPatient: RequestHandler = async (req, res) => {
  try {
    const { name, phone, dob, site, metadata, sex, doctor, patient_ref, analyses } = req.body;
    if (!name) return res.status(400).json({ error: "Name required" });

    const insert = {
      name,
      phone: phone || null,
      dob: dob || null,
      site: site || null,
      metadata: metadata || null,
      sex: sex || null,
      doctor: doctor || null,
      patient_ref: patient_ref || null,
      analyses: Array.isArray(analyses) ? analyses : [],
    };

    const { data, error } = await supabase.from("patients").insert([insert]).select().single();

    if (error) {
      if ((error as any).code === "PGRST205") {
        console.warn("patients table not found. Please run the migration scripts/migrations/006-add-patient-fields.sql on your database.");
        return res.status(500).json({ error: "Missing patients table. Run migration." });
      }
      throw error;
    }
    return res.status(201).json({ patient: data });
  } catch (error) {
    console.error("Error creating patient:", error);
    return res.status(500).json({ error: "Failed to create patient" });
  }
};

export const updatePatient: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, dob, site, metadata, sex, doctor, patient_ref, analyses } = req.body;
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (dob !== undefined) updateData.dob = dob;
    if (site !== undefined) updateData.site = site;
    if (metadata !== undefined) updateData.metadata = metadata;
    if (sex !== undefined) updateData.sex = sex;
    if (doctor !== undefined) updateData.doctor = doctor;
    if (patient_ref !== undefined) updateData.patient_ref = patient_ref;
    if (analyses !== undefined) updateData.analyses = analyses;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase.from("patients").update(updateData).eq("id", id).select().single();
    if (error) {
      if ((error as any).code === "PGRST205") {
        console.warn("patients table not found. Please run the migration scripts/migrations/006-add-patient-fields.sql on your database.");
        return res.status(500).json({ error: "Missing patients table. Run migration." });
      }
      throw error;
    }
    return res.json({ patient: data });
  } catch (error) {
    console.error("Error updating patient:", error);
    return res.status(500).json({ error: "Failed to update patient" });
  }
};

export const deletePatient: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from("patients").delete().eq("id", id);
    if (error) {
      if ((error as any).code === "PGRST205") {
        console.warn("patients table not found. Please run the migration scripts/migrations/006-add-patient-fields.sql on your database.");
        return res.status(500).json({ error: "Missing patients table. Run migration." });
      }
      throw error;
    }
    return res.json({ success: true });
  } catch (error) {
    console.error("Error deleting patient:", error);
    return res.status(500).json({ error: "Failed to delete patient" });
  }
};

// Accept raw QR payload (string) and try to parse into patient fields
export const scanPatientFromQR: RequestHandler = async (req, res) => {
  try {
    const { qr } = req.body;
    if (!qr) return res.status(400).json({ error: "QR payload required" });

    let parsed: any = {};
    try {
      parsed = JSON.parse(qr);
    } catch (_) {
      // Try parsing k=v pairs separated by ; or newlines
      const obj: any = {};
      const parts = qr.split(/;|\n|\|/).map((s: string) => s.trim()).filter(Boolean);
      for (const p of parts) {
        const [k, ...rest] = p.split(/:|=/);
        if (!k) continue;
        obj[k.trim().toLowerCase()] = rest.join(":").trim();
      }
      parsed = obj;
    }

    // Normalize analyses field
    let analyses = parsed.analyses || parsed.analysis || parsed.tests || parsed.tests_list;
    if (typeof analyses === "string") {
      analyses = analyses.split(/,|;/).map((s: string) => ({ name: s.trim(), status: "pending" }));
    }
    if (!Array.isArray(analyses)) analyses = [];

    const result = {
      name: parsed.name || parsed.fullname || parsed.nom || "",
      phone: parsed.phone || parsed.telephone || parsed.tel || null,
      dob: parsed.dob || parsed.date_naissance || null,
      sex: parsed.sex || parsed.sexe || null,
      doctor: parsed.doctor || parsed.medecin || null,
      patient_ref: parsed.patient_ref || parsed.id || parsed.patient_id || null,
      analyses,
    };

    return res.json({ parsed: result });
  } catch (error) {
    console.error("Error parsing QR payload:", error);
    return res.status(500).json({ error: "Failed to parse QR payload" });
  }
};

// Validate or update a single analysis by index: PATCH /api/patients/:id/analyses/:index
export const validateAnalysis: RequestHandler = async (req, res) => {
  try {
    const { id, index } = req.params;
    const idx = Number(index);
    if (!id || Number.isNaN(idx)) return res.status(400).json({ error: "Invalid parameters" });
    const { status } = req.body;
    const { data, error } = await supabase.from("patients").select("analyses").eq("id", id).single();
    if (error) throw error;
    const analyses = (data?.analyses as any[]) || [];
    if (idx < 0 || idx >= analyses.length) return res.status(400).json({ error: "Invalid analysis index" });
    const updated = [...analyses];
    updated[idx] = { ...updated[idx], status: status || "validated", validated_at: new Date().toISOString() };

    const { data: updatedRow, error: updateError } = await supabase.from("patients").update({ analyses: updated, updated_at: new Date().toISOString() }).eq("id", id).select().single();
    if (updateError) throw updateError;
    return res.json({ patient: updatedRow });
  } catch (error) {
    console.error("Error validating analysis:", error);
    return res.status(500).json({ error: "Failed to validate analysis" });
  }
};
