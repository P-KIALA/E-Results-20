import { createClient } from "@supabase/supabase-js";
import { Database } from "@shared/database";

const supabaseUrl = "https://binuiiupqphkbhudlwco.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpbnVpaXVwcXBoa2JodWRsd2NvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NjMzMjEsImV4cCI6MjA3NzEzOTMyMX0.j2JJ4LEXb6TwTV1oSeMm_XdzAWhrST_qlsX6ZSndqek";

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
