import { RequestHandler } from "express";
import { supabase } from "../lib/supabase";
import { hashPassword, verifyPassword, generateToken } from "../lib/auth";
import { LoginRequest, RegisterRequest } from "@shared/api";

const USER_SECURE_FIELDS =
  "id, email, role, permissions, password_hash, primary_site_id, created_at, updated_at";
const USER_PUBLIC_FIELDS =
  "id, email, role, permissions, primary_site_id, created_at, updated_at";

export const login: RequestHandler = async (req, res) => {
  try {
    const { email, password } = req.body as LoginRequest;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Get user from database
    const { data: user, error } = await supabase
      .from("users")
      .select(USER_SECURE_FIELDS)
      .eq("email", email.toLowerCase())
      .single();

    if (error || !user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Verify password
    if (!verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Fetch primary site if exists
    let primarySite = null;
    if (user.primary_site_id) {
      const { data: site } = await supabase
        .from("sites")
        .select("id, name, address, created_at, updated_at")
        .eq("id", user.primary_site_id)
        .single();
      primarySite = site;
    }

    // Generate token
    const token = generateToken(user.id);
    const expiresIn = 3600; // 1 hour in seconds

    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        permissions: user.permissions || [],
        primary_site_id: user.primary_site_id || null,
        primary_site: primarySite,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
      token,
      expiresIn,
    });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ error: "Login failed" });
  }
};

export const register: RequestHandler = async (req, res) => {
  try {
    const {
      email,
      password,
      role = "user",
      permissions = [],
      primary_site_id = null,
    } = req.body as RegisterRequest & { primary_site_id?: string | null };

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters" });
    }

    // primary_site_id is optional - can be assigned later via the sites management page

    // Check if user already exists
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ error: "Email already exists" });
    }

    // Hash password
    const passwordHash = hashPassword(password);

    // Create user
    const { data: user, error } = await supabase
      .from("users")
      .insert({
        email: email.toLowerCase(),
        password_hash: passwordHash,
        role,
        permissions,
        primary_site_id,
        is_collector: req.body.is_collector || false,
      })
      .select(USER_SECURE_FIELDS)
      .single();

    if (error) throw error;

    // Fetch primary site if exists
    let primarySite = null;
    if (user.primary_site_id) {
      const { data: site } = await supabase
        .from("sites")
        .select("id, name, address, created_at, updated_at")
        .eq("id", user.primary_site_id)
        .single();
      primarySite = site;
    }

    // Generate token
    const token = generateToken(user.id);
    const expiresIn = 3600;

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        permissions: user.permissions || [],
        primary_site_id: user.primary_site_id || null,
        primary_site: primarySite,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
      token,
      expiresIn,
    });
  } catch (error) {
    console.error("Error during registration:", error);
    res.status(500).json({ error: "Registration failed" });
  }
};

export const logout: RequestHandler = (_req, res) => {
  // Logout is handled on the client side (clear localStorage/sessionStorage)
  res.json({ success: true });
};

export const getMe: RequestHandler = async (req, res) => {
  try {
    // Get user ID from token (added by middleware)
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Fetch primary site if exists
    let primarySite = null;
    if (user.primary_site_id) {
      const { data: site } = await supabase
        .from("sites")
        .select("id, name, address, created_at, updated_at")
        .eq("id", user.primary_site_id)
        .single();
      primarySite = site;
    }

    res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions || [],
      primary_site_id: user.primary_site_id || null,
      primary_site: primarySite,
      created_at: user.created_at,
      updated_at: user.updated_at,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
};

// Admin-only: get all users
export const getAllUsers: RequestHandler = async (req, res) => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Check if user is admin
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("id", userId)
      .single();

    if (userError || user?.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { data: users, error } = await supabase
      .from("users")
      .select(
        "id, email, role, primary_site_id, permissions, created_at, updated_at",
      )
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Fetch all sites for site names
    const { data: allSites = [] } = await supabase
      .from("sites")
      .select("id, name");

    const sitesMap = new Map(allSites.map((s: any) => [s.id, s]));

    const enrichedUsers = (users || []).map((u: any) => ({
      ...u,
      primary_site: u.primary_site_id
        ? sitesMap.get(u.primary_site_id) || null
        : null,
    }));

    res.json({ users: enrichedUsers });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
};

// Admin-only: delete user
export const deleteUser: RequestHandler = async (req, res) => {
  try {
    const adminId = (req as any).userId;
    const { id: targetUserId } = req.params;

    if (!adminId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Check if admin
    const { data: admin, error: adminError } = await supabase
      .from("users")
      .select("role")
      .eq("id", adminId)
      .single();

    if (adminError || admin?.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (adminId === targetUserId) {
      return res.status(400).json({ error: "Cannot delete your own account" });
    }

    const { error } = await supabase
      .from("users")
      .delete()
      .eq("id", targetUserId);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Failed to delete user" });
  }
};

// Admin-only: update user
export const updateUser: RequestHandler = async (req, res) => {
  try {
    const adminId = (req as any).userId;
    const { id: targetUserId } = req.params;
    const {
      role,
      permissions,
      primary_site_id,
      accessible_site_ids,
      is_collector,
    } = req.body;

    if (!adminId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Check if admin
    const { data: admin, error: adminError } = await supabase
      .from("users")
      .select("role")
      .eq("id", adminId)
      .single();

    if (adminError || admin?.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const updateData: any = {};
    if (role !== undefined) updateData.role = role;
    if (permissions !== undefined) updateData.permissions = permissions;
    if (primary_site_id !== undefined)
      updateData.primary_site_id = primary_site_id;
    if (is_collector !== undefined) updateData.is_collector = is_collector;

    const { data: user, error } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", targetUserId)
      .select()
      .single();

    if (error) throw error;

    // Update accessible sites if provided
    if (
      accessible_site_ids !== undefined &&
      Array.isArray(accessible_site_ids)
    ) {
      // Delete existing access records
      await supabase
        .from("user_site_access")
        .delete()
        .eq("user_id", targetUserId);

      // Insert new access records
      if (accessible_site_ids.length > 0) {
        const accessRecords = accessible_site_ids.map((site_id: string) => ({
          user_id: targetUserId,
          site_id,
        }));

        await supabase.from("user_site_access").insert(accessRecords);
      }
    }

    // Fetch all sites for site names
    const { data: allSites = [] } = await supabase
      .from("sites")
      .select("id, name");

    const sitesMap = new Map(allSites.map((s: any) => [s.id, s]));

    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        permissions: user.permissions || [],
        primary_site_id: user.primary_site_id || null,
        primary_site: user.primary_site_id
          ? sitesMap.get(user.primary_site_id) || null
          : null,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
    });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Failed to update user" });
  }
};
