import { RequestHandler } from "express";
import { supabase } from "../lib/supabase";
import { AuthRequest } from "../lib/middleware";

// Create a queue item
export const createQueueItem: RequestHandler = async (req, res) => {
  try {
    const { patient_id, eta, notes } = req.body;
    if (!patient_id)
      return res.status(400).json({ error: "patient_id required" });

    const { data, error } = await supabase.from("sample_queue").insert([
      {
        patient_id,
        eta: eta || null,
        notes: notes || null,
      },
    ]);

    if (error) return res.status(500).json({ error: error?.message || error });
    return res.json({ data: data?.[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "internal" });
  }
};

// List queue items with optional filters
export const listQueue: RequestHandler = async (req, res) => {
  try {
    const { status, collector_id } = req.query as any;
    let query: any = supabase
      .from("sample_queue")
      .select("*")
      .order("created_at", { ascending: true });

    if (status) query = query.eq("status", status);
    if (collector_id) query = query.eq("collector_id", collector_id);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error?.message || error });
    return res.json({ data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "internal" });
  }
};

// Admin can assign a queue item to a collector
export const assignQueue: RequestHandler = async (req, res) => {
  try {
    const userId = (req as AuthRequest).userId;
    if (!userId) return res.status(401).json({ error: "auth required" });

    // Check admin
    const { data: adminUser } = await supabase
      .from("users")
      .select("role")
      .eq("id", userId)
      .single();
    if (!adminUser || adminUser.role !== "admin")
      return res.status(403).json({ error: "admin required" });

    const { id } = req.params;
    const { collector_id } = req.body;
    if (!collector_id)
      return res.status(400).json({ error: "collector_id required" });

    const { data, error } = await supabase
      .from("sample_queue")
      .update({
        collector_id,
        status: "assigned",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select();

    if (error) return res.status(500).json({ error: error?.message || error });
    return res.json({ data: data?.[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "internal" });
  }
};

// Collector claims an item
export const claimQueue: RequestHandler = async (req, res) => {
  try {
    const userId = (req as AuthRequest).userId;
    if (!userId) return res.status(401).json({ error: "auth required" });

    // Check collector flag
    const { data: user } = await supabase
      .from("users")
      .select("is_collector,role")
      .eq("id", userId)
      .single();
    if (!user) return res.status(403).json({ error: "user not found" });
    if (!user.is_collector && user.role !== "admin")
      return res.status(403).json({ error: "collector role required" });

    const { id } = req.params;
    // Try to claim only if unassigned or assigned to me
    const { data: existing } = await supabase
      .from("sample_queue")
      .select("collector_id,status")
      .eq("id", id)
      .single();
    if (!existing) return res.status(404).json({ error: "item not found" });
    if (existing.collector_id && existing.collector_id !== userId) {
      return res
        .status(409)
        .json({ error: "already assigned to another collector" });
    }

    const { data, error } = await supabase
      .from("sample_queue")
      .update({
        collector_id: userId,
        status: "in_progress",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select();

    if (error) return res.status(500).json({ error: error?.message || error });
    return res.json({ data: data?.[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "internal" });
  }
};

// Collector releases an item
export const releaseQueue: RequestHandler = async (req, res) => {
  try {
    const userId = (req as AuthRequest).userId;
    if (!userId) return res.status(401).json({ error: "auth required" });

    const { id } = req.params;
    const { data: item } = await supabase
      .from("sample_queue")
      .select("collector_id")
      .eq("id", id)
      .single();
    if (!item) return res.status(404).json({ error: "item not found" });
    if (item.collector_id !== userId)
      return res.status(403).json({ error: "only assignee can release" });

    const { data, error } = await supabase
      .from("sample_queue")
      .update({
        collector_id: null,
        status: "waiting",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select();

    if (error) return res.status(500).json({ error: error?.message || error });
    return res.json({ data: data?.[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "internal" });
  }
};

// Collector completes an item
export const completeQueue: RequestHandler = async (req, res) => {
  try {
    const userId = (req as AuthRequest).userId;
    if (!userId) return res.status(401).json({ error: "auth required" });

    const { id } = req.params;
    const { data: item } = await supabase
      .from("sample_queue")
      .select("collector_id")
      .eq("id", id)
      .single();
    if (!item) return res.status(404).json({ error: "item not found" });
    if (item.collector_id !== userId)
      return res.status(403).json({ error: "only assignee can complete" });

    const { data, error } = await supabase
      .from("sample_queue")
      .update({ status: "done", updated_at: new Date().toISOString() })
      .eq("id", id)
      .select();

    if (error) return res.status(500).json({ error: error?.message || error });
    return res.json({ data: data?.[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "internal" });
  }
};

// List collectors
export const getCollectors: RequestHandler = async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("id,email")
      .eq("is_collector", true);
    if (error) return res.status(500).json({ error });
    return res.json({ data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "internal" });
  }
};
