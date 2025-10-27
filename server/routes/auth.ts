import { RequestHandler } from "express";
import { supabase } from "../lib/supabase";
import { hashPassword, verifyPassword, generateToken } from "../lib/auth";
import { LoginRequest, RegisterRequest } from "@shared/api";

export const login: RequestHandler = async (req, res) => {
  try {
    const { email, password } = req.body as LoginRequest;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Get user from database
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email.toLowerCase())
      .single();

    if (error || !user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Verify password
    if (!verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: "Invalid email or password" });
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
      site = null,
    } = req.body as RegisterRequest & { site?: string | null };

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters" });
    }

    // Check if user already exists
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("email", email.toLowerCase())
      .single();

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
      })
      .select()
      .single();

    if (error) throw error;

    // Generate token
    const token = generateToken(user.id);
    const expiresIn = 3600;

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        permissions: user.permissions || [],
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

    res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions || [],
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
      .select("id, email, role, created_at, updated_at")
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json({ users: users || [] });
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
    const { role, permissions } = req.body;

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

    const { data: user, error } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", targetUserId)
      .select()
      .single();

    if (error) throw error;

    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        permissions: user.permissions || [],
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
    });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Failed to update user" });
  }
};
