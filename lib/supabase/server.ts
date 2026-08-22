import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | null | undefined;
let cachedAdminClient: SupabaseClient | null | undefined;

function makeClient(key: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl || !key) return null;
  return createClient(supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function getSupabaseServerClient() {
  if (cachedClient !== undefined) return cachedClient;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  cachedClient = makeClient(key);
  return cachedClient;
}

export function getSupabaseAdminClient() {
  if (cachedAdminClient !== undefined) return cachedAdminClient;
  cachedAdminClient = makeClient(process.env.SUPABASE_SERVICE_ROLE_KEY || "");
  return cachedAdminClient;
}

export function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY));
}
