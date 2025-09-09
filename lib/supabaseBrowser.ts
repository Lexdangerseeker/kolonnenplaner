import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function supabase(){
  if (client) return client;
  if (typeof window === "undefined") {
    // Wird nie im SSR benutzt, da die Seiten ssr:false sind.
    throw new Error("supabase browser client in SSR context");
  }
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL/ANON_KEY");
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}
