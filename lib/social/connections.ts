import { getSupabaseAdminClient } from "@/lib/supabase/server";
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

function normalize(row: Record<string, unknown>): StoredSocialConnection {
  return {
    id: String(row.id),
    clerkUserId: String(row.clerk_user_id),
    platform: row.platform as SocialPlatform,
    externalAccountId: String(row.external_account_id),
    accountName: typeof row.account_name === "string" ? row.account_name : null,
    accessToken: String(row.access_token),
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
    .maybeSingle();
  if (error || !data) return null;
  return normalize(data as Record<string, unknown>);
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
  const { error } = await supabase.from("social_connections").upsert({
    clerk_user_id: input.userId,
    platform: input.platform,
    external_account_id: input.externalAccountId,
    account_name: input.accountName || null,
    access_token: input.accessToken,
    token_expires_at: input.tokenExpiresAt || null,
    metadata: input.metadata || {},
  }, { onConflict: "clerk_user_id,platform" });
  if (error) throw new Error("Sosyal hesap bağlantısı kaydedilemedi.");
}

export async function deleteSocialConnection(userId: string, platform: SocialPlatform) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return false;
  const { error } = await supabase.from("social_connections").delete().eq("clerk_user_id", userId).eq("platform", platform);
  return !error;
}
