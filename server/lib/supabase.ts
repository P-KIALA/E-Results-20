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

const supabaseClient = createClient<Database>(
  supabaseUrl,
  supabaseServiceKey || "",
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

export const supabase = supabaseClient as any;

export type SupabaseClient = typeof supabaseClient;
