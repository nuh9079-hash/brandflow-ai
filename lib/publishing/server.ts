import { getSupabaseServerClient } from "@/lib/supabase/server";
import { createSignedMediaUrl } from "@/lib/media/storage";
import type { PublishAttempt, PublishAttemptStatus } from "@/lib/publishing/types";

type Result<T> = { ok: true; data: T } | { ok: false; status: number; error: string };
const columns = "id,retry_of_id,platform,account_name,account_username,media_asset_id,caption,status,provider_media_id,error_code,error_message,created_at,updated_at,completed_at,media_assets(name,type,storage_path)";

function nullable(value: unknown) { return typeof value === "string" && value ? value : null; }
function logError(operation: string, error: unknown) {
  const value = error && typeof error === "object" ? error as Record<string, unknown> : {};
  console.error(`Supabase publish attempts error [${operation}]`, { code: value.code ?? null, message: value.message ?? String(error), details: value.details ?? null, hint: value.hint ?? null });
}

async function normalize(userId: string, row: Record<string, unknown>): Promise<PublishAttempt> {
  const relation = row.media_assets && typeof row.media_assets === "object" && !Array.isArray(row.media_assets) ? row.media_assets as Record<string, unknown> : null;
  const storagePath = relation ? nullable(relation.storage_path) : null;
  const signed = storagePath ? await createSignedMediaUrl(userId, storagePath) : null;
  const mediaType = relation && ["image", "video", "logo"].includes(String(relation.type)) ? String(relation.type) as "image" | "video" | "logo" : "image";
  const status = ["pending", "published", "failed"].includes(String(row.status)) ? String(row.status) as PublishAttemptStatus : "failed";
  return {
    id: String(row.id), retryOfId: nullable(row.retry_of_id), platform: "instagram", accountName: nullable(row.account_name), accountUsername: nullable(row.account_username),
    mediaAssetId: String(row.media_asset_id), caption: String(row.caption || ""), status, providerMediaId: nullable(row.provider_media_id),
    errorCode: nullable(row.error_code), errorMessage: nullable(row.error_message),
    media: relation ? { name: String(relation.name || "Medya"), type: mediaType, signedUrl: signed?.ok ? signed.data.signedUrl : null } : null,
    createdAt: String(row.created_at || ""), updatedAt: String(row.updated_at || ""), completedAt: nullable(row.completed_at),
  };
}

export async function createPublishAttempt(userId: string, input: {
  retryOfId?: string | null; accountName?: string | null; accountUsername?: string | null; mediaAssetId: string; caption: string;
}): Promise<Result<{ id: string }>> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { ok: false, status: 503, error: "Paylaşım geçmişi yapılandırılmadı." };
  const { data, error } = await supabase.from("publish_attempts").insert({
    clerk_user_id: userId, retry_of_id: input.retryOfId || null, platform: "instagram", account_name: input.accountName || null,
    account_username: input.accountUsername || null, media_asset_id: input.mediaAssetId, caption: input.caption, status: "pending",
  }).select("id").single();
  if (error || !data) { logError("create", error); return { ok: false, status: 500, error: "Paylaşım geçmişi kaydı oluşturulamadı." }; }
  return { ok: true, data: { id: String(data.id) } };
}

export async function finishPublishAttempt(userId: string, id: string, input: {
  status: "published" | "failed"; providerMediaId?: string | null; errorCode?: string | null; errorMessage?: string | null;
}): Promise<void> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return;
  const { error } = await supabase.from("publish_attempts").update({
    status: input.status, provider_media_id: input.providerMediaId || null, error_code: input.errorCode || null,
    error_message: input.errorMessage || null, completed_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  }).eq("id", id).eq("clerk_user_id", userId);
  if (error) logError("finish", error);
}

export async function listPublishAttempts(userId: string): Promise<Result<PublishAttempt[]>> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { ok: false, status: 503, error: "Paylaşım geçmişi yapılandırılmadı." };
  const { data, error } = await supabase.from("publish_attempts").select(columns).eq("clerk_user_id", userId).order("created_at", { ascending: false }).limit(100);
  if (error) { logError("list", error); return { ok: false, status: error.code === "PGRST205" ? 503 : 500, error: error.code === "PGRST205" ? "Paylaşım geçmişi tablosu henüz kurulmamış." : "Paylaşım geçmişi yüklenemedi." }; }
  return { ok: true, data: await Promise.all((data || []).map((row) => normalize(userId, row as Record<string, unknown>))) };
}

export async function getRetryAttempt(userId: string, id: string): Promise<Result<PublishAttempt>> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { ok: false, status: 503, error: "Paylaşım geçmişi yapılandırılmadı." };
  const { data, error } = await supabase.from("publish_attempts").select(columns).eq("id", id).eq("clerk_user_id", userId).maybeSingle();
  if (error) { logError("retry-read", error); return { ok: false, status: 500, error: "Paylaşım kaydı okunamadı." }; }
  if (!data) return { ok: false, status: 404, error: "Paylaşım kaydı bulunamadı." };
  return { ok: true, data: await normalize(userId, data as Record<string, unknown>) };
}
