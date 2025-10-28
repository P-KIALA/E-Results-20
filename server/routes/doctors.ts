import { RequestHandler } from "express";
import { supabase } from "../lib/supabase";
import {
  validateAndFormatPhone,
  checkWhatsAppAvailability,
} from "../lib/phone";
import { AddDoctorRequest, Doctor } from "@shared/api";

export const getDoctors: RequestHandler = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("doctors")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json({ doctors: data || [] });
  } catch (error) {
    console.error("Error fetching doctors:", error);
    res.status(500).json({ error: "Failed to fetch doctors" });
  }
};

export const addDoctor: RequestHandler = async (req, res) => {
  try {
    const { phone, name, specialization, cnom } = req.body as AddDoctorRequest;

    if (!phone || !name) {
      return res.status(400).json({ error: "Phone and name are required" });
    }

    // Validate and format phone
    const phoneValidation = validateAndFormatPhone(phone);
    if (!phoneValidation.is_valid) {
      return res.status(400).json({ error: "Invalid phone number format" });
    }

    const formatted_phone = phoneValidation.formatted_phone;

    // Check if phone already exists
    const { data: existingPhone } = await supabase
      .from("doctors")
      .select("id")
      .eq("phone", formatted_phone)
      .single();

    if (existingPhone) {
      return res.status(409).json({ error: "Ce numéro de téléphone existe déjà" });
    }

    // Check if CNOM already exists (if provided)
    if (cnom && cnom.trim()) {
      const { data: existingCnom } = await supabase
        .from("doctors")
        .select("id")
        .eq("cnom", cnom.trim())
        .single();

      if (existingCnom) {
        return res.status(409).json({ error: "Ce numéro CNOM existe déjà" });
      }
    }

    // Check WhatsApp availability
    const is_whatsapp = await checkWhatsAppAvailability(formatted_phone);

    const { data, error } = await supabase
      .from("doctors")
      .insert({
        phone: formatted_phone,
        name,
        specialization,
        cnom: cnom && cnom.trim() ? cnom.trim() : null,
        whatsapp_verified: is_whatsapp,
        whatsapp_verified_at: is_whatsapp ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json(data);
  } catch (error) {
    console.error("Error adding doctor:", error);
    res.status(500).json({ error: "Failed to add doctor" });
  }
};

export const updateDoctor: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { phone, name, specialization, cnom } = req.body;

    const updateData: any = {};
    if (name) updateData.name = name;
    if (specialization !== undefined)
      updateData.specialization = specialization;

    // If phone is being updated, validate and recheck WhatsApp
    if (phone) {
      const phoneValidation = validateAndFormatPhone(phone);
      if (!phoneValidation.is_valid) {
        return res.status(400).json({ error: "Invalid phone number format" });
      }

      // Check if phone already exists on another doctor
      const { data: existingPhone } = await supabase
        .from("doctors")
        .select("id")
        .eq("phone", phoneValidation.formatted_phone)
        .neq("id", id)
        .single();

      if (existingPhone) {
        return res.status(409).json({ error: "Ce numéro de téléphone existe déjà" });
      }

      const is_whatsapp = await checkWhatsAppAvailability(
        phoneValidation.formatted_phone,
      );
      updateData.phone = phoneValidation.formatted_phone;
      updateData.whatsapp_verified = is_whatsapp;
      updateData.whatsapp_verified_at = is_whatsapp
        ? new Date().toISOString()
        : null;
    }

    // If CNOM is being updated, check for duplicates
    if (cnom !== undefined) {
      if (cnom && cnom.trim()) {
        const { data: existingCnom } = await supabase
          .from("doctors")
          .select("id")
          .eq("cnom", cnom.trim())
          .neq("id", id)
          .single();

        if (existingCnom) {
          return res.status(409).json({ error: "Ce numéro CNOM existe déjà" });
        }

        updateData.cnom = cnom.trim();
      } else {
        updateData.cnom = null;
      }
    }

    const { data, error } = await supabase
      .from("doctors")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json(data);
  } catch (error) {
    console.error("Error updating doctor:", error);
    res.status(500).json({ error: "Failed to update doctor" });
  }
};

export const deleteDoctor: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase.from("doctors").delete().eq("id", id);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting doctor:", error);
    res.status(500).json({ error: "Failed to delete doctor" });
  }
};

export const verifyDoctor: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;

    // Get doctor's phone
    const { data: doctor, error: fetchError } = await supabase
      .from("doctors")
      .select("phone")
      .eq("id", id)
      .single();

    if (fetchError) throw fetchError;

    // Recheck WhatsApp availability
    const is_whatsapp = await checkWhatsAppAvailability(doctor.phone);

    const { data, error } = await supabase
      .from("doctors")
      .update({
        whatsapp_verified: is_whatsapp,
        whatsapp_verified_at: is_whatsapp ? new Date().toISOString() : null,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error("Error verifying doctor:", error);
    res.status(500).json({ error: "Failed to verify doctor" });
  }
};
