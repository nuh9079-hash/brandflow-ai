import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { decryptSocialToken, encryptSocialToken } from "@/lib/social/token-crypto";
import type { SocialPlatform } from "@/lib/social/types";

export type StoredSocialConnection = {
  id: string;
  clerkUserId: string;
  platform: SocialPlatform;
  externalAccountId: string;
  accountName: string | null;
  accessToken: string;
  tokenExpiresAt: string | null;
  metadata: Record<string, unknown>;
};

function normalize(row: Record<string, unknown>): StoredSocialConnection | null {
  const encrypted = typeof row.access_token_encrypted === "string" ? row.access_token_encrypted : "";
  if (!encrypted) return null;
  let accessToken = "";
  try { accessToken = decryptSocialToken(encrypted); }
  catch { return null; }
  const accountId = typeof row.platform_account_id === "string" ? row.platform_account_id : "";
  if (!accessToken || !accountId) return null;
  return {
    id: String(row.id),
    clerkUserId: String(row.clerk_user_id),
    platform: row.platform as SocialPlatform,
    externalAccountId: accountId,
    accountName: typeof row.account_name === "string" ? row.account_name : null,
    accessToken,
    tokenExpiresAt: typeof row.token_expires_at === "string" ? row.token_expires_at : null,
    metadata: row.metadata && typeof row.metadata === "object" ? row.metadata as Record<string, unknown> : {},
  };
}

export async function getSocialConnection(userId: string, platform: SocialPlatform) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("social_connections")
    .select("*")
    .eq("clerk_user_id", userId)
    .eq("platform", platform)
    .eq("status", "connected")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  const normalized = normalize(data as Record<string, unknown>);
  if (!normalized) return null;
  if (normalized.tokenExpiresAt && new Date(normalized.tokenExpiresAt).getTime() <= Date.now()) return null;
  return normalized;
}

export async function upsertSocialConnection(input: {
  userId: string;
  platform: SocialPlatform;
  externalAccountId: string;
  accountName?: string | null;
  accessToken: string;
  tokenExpiresAt?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) throw new Error("Supabase service-role bağlantısı eksik.");
  const record = {
    clerk_user_id: input.userId,
    platform: input.platform,
    platform_account_id: input.externalAccountId,
    account_name: input.accountName || null,
    access_token_encrypted: encryptSocialToken(input.accessToken),
    token_expires_at: input.tokenExpiresAt || null,
    status: "connected",
    metadata: input.metadata || {},
    last_error: null,
    updated_at: new Date().toISOString(),
  };
  const { data: existing } = await supabase
    .from("social_connections")
    .select("id")
    .eq("clerk_user_id", input.userId)
    .eq("platform", input.platform)
    .eq("platform_account_id", input.externalAccountId)
    .limit(1)
    .maybeSingle();
  const query = existing?.id
    ? supabase.from("social_connections").update(record).eq("id", existing.id)
    : supabase.from("social_connections").insert(record);
  const { error } = await query;
  if (error) throw new Error("Sosyal hesap bağlantısı kaydedilemedi.");
}

export async function deleteSocialConnection(userId: string, platform: SocialPlatform) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return false;
  const { error } = await supabase.from("social_connections").update({
    access_token_encrypted: null,
    refresh_token_encrypted: null,
    token_expires_at: null,
    status: "disconnected",
    last_error: null,
    updated_at: new Date().toISOString(),
  }).eq("clerk_user_id", userId).eq("platform", platform);
  return !error;
}
