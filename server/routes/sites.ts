import { RequestHandler } from "express";
import { supabase } from "../lib/supabase";

export const getSites: RequestHandler = async (req, res) => {
  try {
    const { data: sites, error } = await supabase
      .from("sites")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw error;

    res.json({ sites: sites || [] });
  } catch (error) {
    console.error("Error fetching sites:", error);
    res.status(500).json({ error: "Failed to fetch sites" });
  }
};

export const createSite: RequestHandler = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Site name is required" });
    }

    // Check if user is admin
    const userId = (req as any).userId;
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("id", userId)
      .single();

    if (userError || user?.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Check if site already exists
    const { data: existing } = await supabase
      .from("sites")
      .select("id")
      .eq("name", name.trim())
      .single();

    if (existing) {
      return res.status(409).json({ error: "Site already exists" });
    }

    // Create site
    const { data: site, error } = await supabase
      .from("sites")
      .insert({ name: name.trim() })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ site });
  } catch (error) {
    console.error("Error creating site:", error);
    res.status(500).json({ error: "Failed to create site" });
  }
};

export const getUserAccessibleSites: RequestHandler = async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id: targetUserId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Check if requesting user is admin
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("id", userId)
      .single();

    if (userError) throw userError;

    // If not admin, can only view own sites
    if (user?.role !== "admin" && userId !== targetUserId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Get accessible sites
    const { data: accessRecords, error: accessError } = await supabase
      .from("user_site_access")
      .select("site_id")
      .eq("user_id", targetUserId);

    if (accessError) throw accessError;

    const siteIds = (accessRecords || []).map((r: any) => r.site_id);

    // Get site details
    const { data: sites, error: sitesError } = await supabase
      .from("sites")
      .select("*")
      .in("id", siteIds.length > 0 ? siteIds : ["00000000-0000-0000-0000-000000000000"]);

    if (sitesError) throw sitesError;

    res.json({ sites: sites || [] });
  } catch (error) {
    console.error("Error fetching user accessible sites:", error);
    res.status(500).json({ error: "Failed to fetch accessible sites" });
  }
};
