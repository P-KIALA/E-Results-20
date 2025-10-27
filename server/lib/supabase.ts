import { createClient } from "@supabase/supabase-js";
import { Database } from "@shared/database";

const supabaseUrl =
  process.env.SUPABASE_URL || "https://binuiiupqphkbhudlwco.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.warn(
    "SUPABASE_SERVICE_ROLE_KEY is not set. Some operations may fail.",
  );
}

export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseServiceKey || "",
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

export type SupabaseClient = typeof supabase;
