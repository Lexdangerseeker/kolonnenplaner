import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let admin: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (admin) return admin;
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE || "";
  if (!url) throw new Error("ENV SUPABASE_URL fehlt (.env.local setzen)");
  if (!key) throw new Error("ENV SUPABASE_SERVICE_ROLE fehlt (.env.local Service-Role Key setzen)");
  admin = createClient(url, key, { auth: { persistSession: false } });
  return admin;
}
