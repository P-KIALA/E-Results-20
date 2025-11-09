import { supabase } from "../lib/supabase";
import { verifyPassword, generateToken } from "../lib/auth";

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const USER_SECURE_FIELDS =
      "id, email, role, permissions, password_hash, primary_site_id, created_at, updated_at";

    // Get user from database
    const { data, error } = await supabase
      .from("users")
      .select(USER_SECURE_FIELDS)
      .eq("email", String(email).toLowerCase())
      .single();

    const user = (data as any) || null;

    if (error || !user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Verify password
    if (!verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Fetch primary site if exists
    let primarySite: any = null;
    if (user.primary_site_id) {
      const { data: siteData } = await supabase
        .from("sites")
        .select("id, name, address, created_at, updated_at")
        .eq("id", user.primary_site_id)
        .single();
      primarySite = siteData || null;
    }

    // Generate token
    const token = generateToken(user.id);
    const expiresIn = 3600; // 1 hour

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
}
