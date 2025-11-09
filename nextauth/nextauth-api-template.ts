/*
Template: NextAuth API route (Next.js) using CredentialsProvider and Supabase.
Place this file at: pages/api/auth/[...nextauth].ts in a Next.js app.

Prerequisites:
- Install: npm i next-auth @next-auth/prisma-adapter (or just next-auth)
- Ensure NEXTAUTH_URL and NEXTAUTH_SECRET are set in environment (Vercel).
- This template uses supabase-js to query your users table and the same verifyPassword function
  as in server/lib/auth.ts. Copy verifyPassword logic or import from a shared location.

How it works:
- CredentialsProvider receives email/password from client signIn call.
- It queries Supabase for the user, verifies the stored hash (salt:hash pbkdf2), and
  on success returns a user object to NextAuth which creates a session.

Security notes:
- Keep SUPABASE_SERVICE_ROLE_KEY and NEXTAUTH_SECRET secret and set in Vercel environment for Production.
- In production use HTTPS and a strong NEXTAUTH_SECRET.
*/

import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { createClient } from "@supabase/supabase-js";

// Minimal verifyPassword implementation. You can import the one from server/lib/auth.ts
import * as crypto from "crypto";
function verifyPasswordLocal(password: string, hash: string): boolean {
  if (!hash || typeof hash !== "string") return false;
  const parts = hash.split(":");
  if (parts.length !== 2) return false;
  const [salt, originalHash] = parts;
  const newHash = crypto
    .pbkdf2Sync(password, salt, 1000, 64, "sha512")
    .toString("hex");
  return newHash === originalHash;
}

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

export default NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        const email = (credentials?.email || "").toLowerCase();
        const password = credentials?.password || "";
        if (!email || !password) return null;

        // Query Supabase users table
        const { data, error } = await supabase
          .from("users")
          .select("id, email, password_hash, role, permissions, primary_site_id")
          .eq("email", email)
          .single();

        const user = (data as any) || null;
        if (error || !user) return null;

        // Verify password using same algorithm as server/lib/auth.ts
        const ok = verifyPasswordLocal(password, user.password_hash);
        if (!ok) return null;

        // Return any object - will be saved in session
        return {
          id: user.id,
          email: user.email,
          role: user.role,
          permissions: user.permissions || [],
          primary_site_id: user.primary_site_id || null,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  jwt: {
    // secret is read from NEXTAUTH_SECRET
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.user = user;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && (token as any).user) {
        session.user = (token as any).user;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
});
