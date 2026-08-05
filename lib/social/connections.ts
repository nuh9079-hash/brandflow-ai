import { getSupabaseServerClient } from "@/lib/supabase/server";

export const socialPlatforms = ["instagram", "facebook", "linkedin", "x", "youtube", "tiktok"] as const;
export const connectionStatuses = ["disconnected", "connecting", "connected", "expired", "error"] as const;

export type SocialPlatform = (typeof socialPlatforms)[number];
export type ConnectionStatus = (typeof connectionStatuses)[number];

export type SafeSocialConnection = {
  id: string;
  profileId: string | null;
  platform: SocialPlatform;
  platformAccountId: string | null;
  accountName: string | null;
  accountUsername: string | null;
  tokenExpiresAt: string | null;
  status: ConnectionStatus;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
};

type ConnectionResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

type SupabaseErrorShape = {
  name?: string;
  stack?: string;
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

function logConnectionError(operation: string, error: unknown) {
  const value = error && typeof error === "object" ? error as SupabaseErrorShape : {};
  console.error(`Supabase social connections error [${operation}]`, {
    name: value.name ?? null,
    stack: value.stack ?? null,
    code: value.code ?? null,
    message: value.message ?? String(error),
    details: value.details ?? null,
    hint: value.hint ?? null,
  });
}

const safeColumns = "id,profile_id,platform,platform_account_id,account_name,account_username,token_expires_at,status,last_error,created_at,updated_at";

function normalize(row: Record<string, unknown>): SafeSocialConnection {
  const platform = socialPlatforms.includes(row.platform as SocialPlatform) ? row.platform as SocialPlatform : "instagram";
  const expiresAt = typeof row.token_expires_at === "string" ? row.token_expires_at : null;
  const storedStatus = connectionStatuses.includes(row.status as ConnectionStatus) ? row.status as ConnectionStatus : "error";
  const status = storedStatus === "connected" && expiresAt && new Date(expiresAt).getTime() <= Date.now() ? "expired" : storedStatus;
  return {
    id: String(row.id),
    profileId: typeof row.profile_id === "string" ? row.profile_id : null,
    platform,
    platformAccountId: typeof row.platform_account_id === "string" ? row.platform_account_id : null,
    accountName: typeof row.account_name === "string" ? row.account_name : null,
    accountUsername: typeof row.account_username === "string" ? row.account_username : null,
    tokenExpiresAt: expiresAt,
    status,
    lastError: typeof row.last_error === "string" ? row.last_error : null,
    createdAt: String(row.created_at || ""),
    updatedAt: String(row.updated_at || ""),
  };
}

export async function listSocialConnections(userId: string): Promise<ConnectionResult<SafeSocialConnection[]>> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { ok: false, status: 503, error: "Sosyal bağlantı altyapısı yapılandırılmadı." };
  const { data, error } = await supabase
    .from("social_connections")
    .select(safeColumns)
    .eq("clerk_user_id", userId)
    .order("created_at", { ascending: false });
  if (error) {
    logConnectionError("social_connections.list", error);
    if (error.code === "PGRST205") {
      return {
        ok: false,
        status: 503,
        error: "Sosyal bağlantılar tablosu henüz kurulmamış. Supabase social_connections migration'ını çalıştırın.",
      };
    }
    return { ok: false, status: 500, error: "Sosyal bağlantılar yüklenemedi." };
  }
  return { ok: true, data: (data || []).map((row) => normalize(row as Record<string, unknown>)) };
}

export async function deleteSocialConnection(userId: string, connectionId: string): Promise<ConnectionResult<{ deleted: true }>> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { ok: false, status: 503, error: "Sosyal bağlantı altyapısı yapılandırılmadı." };
  const { data, error } = await supabase
    .from("social_connections")
    .delete()
    .eq("id", connectionId)
    .eq("clerk_user_id", userId)
    .select("id")
    .maybeSingle();
  if (error) {
    logConnectionError("social_connections.delete", error);
    return { ok: false, status: error.code === "PGRST205" ? 503 : 500, error: "Sosyal hesap bağlantısı kaldırılamadı." };
  }
  if (!data) return { ok: false, status: 404, error: "Sosyal hesap bağlantısı bulunamadı." };
  return { ok: true, data: { deleted: true } };
}
