import { RequestHandler } from "express";
import { supabase } from "../lib/supabase";

export const getPatients: RequestHandler = async (_req, res) => {
  try {
    const { data, error } = await supabase.from("patients").select("*").order("created_at", { ascending: false });
    if (error) {
      // If table missing, return empty list and log actionable hint
      if ((error as any).code === "PGRST205") {
        console.warn("patients table not found. Please run the migration scripts/migrations/005-create-patients.sql on your database.");
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
    const { name, phone, dob, site, metadata } = req.body;
    if (!name) return res.status(400).json({ error: "Name required" });

    const { data, error } = await supabase.from("patients").insert([
      { name, phone: phone || null, dob: dob || null, site: site || null, metadata: metadata || null },
    ]).select().single();

    if (error) {
      if ((error as any).code === "PGRST205") {
        console.warn("patients table not found. Please run the migration scripts/migrations/005-create-patients.sql on your database.");
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
    const { name, phone, dob, site, metadata } = req.body;
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (dob !== undefined) updateData.dob = dob;
    if (site !== undefined) updateData.site = site;
    if (metadata !== undefined) updateData.metadata = metadata;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase.from("patients").update(updateData).eq("id", id).select().single();
    if (error) {
      if ((error as any).code === "PGRST205") {
        console.warn("patients table not found. Please run the migration scripts/migrations/005-create-patients.sql on your database.");
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
        console.warn("patients table not found. Please run the migration scripts/migrations/005-create-patients.sql on your database.");
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
