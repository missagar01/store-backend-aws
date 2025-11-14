import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

// 🔹 URL resolve priority: server env > Vite env
const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  "";

// 🔹 Prefer SERVICE ROLE key on backend
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  "";

// Basic validations
if (!SUPABASE_URL) {
  console.error("❌ Supabase URL missing. Please set SUPABASE_URL (or VITE_SUPABASE_URL).");
  process.exit(1);
}

if (!SUPABASE_SERVICE_ROLE_KEY && !SUPABASE_ANON_KEY) {
  console.error(
    "❌ Supabase keys missing. Set SUPABASE_SERVICE_ROLE_KEY (preferred for backend) or SUPABASE_ANON_KEY."
  );
  process.exit(1);
}

// 🔹 Decide which key to use
const SUPABASE_KEY = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "⚠️ Using ANON key on backend. Prefer SUPABASE_SERVICE_ROLE_KEY for server-side code (RLS bypass where needed)."
  );
}

// 🔹 Server-side tuning: no local storage, no URL session, no auto refresh
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: false,    // backend me session store ki zarurat nahi
    autoRefreshToken: false,  // cron/token refresh ki zarurat nahi
    detectSessionInUrl: false // backend me OAuth redirect handling nahi
  },
  global: {
    headers: {
      "X-Client-Name": "srmpl-backend" // optional: debug/tracing ke liye
    }
  }
});

export default supabase;
