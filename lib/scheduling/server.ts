import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getMedia } from "@/lib/media/server";
import { createSignedMediaUrl } from "@/lib/media/storage";
import { listSocialConnections } from "@/lib/social/connections";
import type { ScheduledPublish, ScheduledPublishInput, ScheduledPublishStatus } from "@/lib/scheduling/types";

type Result<T> = { ok: true; data: T } | { ok: false; status: number; error: string };
const statuses: ScheduledPublishStatus[] = ["scheduled", "processing", "published", "failed", "cancelled"];
const columns = "id,profile_id,media_asset_id,title,caption,scheduled_at,timezone,platforms,status,metadata,last_error,published_at,created_at,updated_at,media_assets(name,type,storage_path)";

function text(value: unknown, max: number) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }
function nullable(value: unknown, max = 160) { const result = text(value, max); return result || null; }
function list(value: unknown, max = 10) { return Array.isArray(value) ? Array.from(new Set(value.map((item) => text(item, 80)).filter(Boolean))).slice(0, max) : []; }
function safeMetadata(value: unknown) { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function logError(operation: string, error: unknown) { const value = error && typeof error === "object" ? error as Record<string, unknown> : {}; console.error(`Supabase scheduled publish error [${operation}]`, { code: value.code ?? null, message: value.message ?? String(error), details: value.details ?? null, hint: value.hint ?? null }); }

export function sanitizeScheduledPublishInput(value: unknown): Result<ScheduledPublishInput> {
  const raw = safeMetadata(value);
  const scheduledAtRaw = text(raw.scheduledAt, 80); const scheduledDate = new Date(scheduledAtRaw);
  const platforms = list(raw.platforms, 6);
  const mediaAssetId = text(raw.mediaAssetId, 120); const caption = text(raw.caption, 5000);
  if (!mediaAssetId || !caption || !platforms.length || !scheduledAtRaw || Number.isNaN(scheduledDate.getTime())) return { ok: false, status: 400, error: "Plan bilgilerini kontrol et." };
  if (platforms.some((platform) => platform !== "instagram")) return { ok: false, status: 400, error: "Otomatik yayınlama şu anda yalnızca gerçek Instagram bağlantısı için aktif." };
  return { ok: true, data: {
    profileId: nullable(raw.profileId), mediaAssetId, platforms, title: text(raw.title, 160) || caption.split(/\r?\n/)[0].slice(0, 160) || "Planlı paylaşım",
    caption, hashtags: list(raw.hashtags, 30), platformContent: safeMetadata(raw.platformContent), scheduledAt: scheduledDate.toISOString(),
    timezone: text(raw.timezone, 80) || "UTC",
  } };
}

async function normalize(userId: string, row: Record<string, unknown>): Promise<ScheduledPublish> {
  const metadata = safeMetadata(row.metadata); const relation = safeMetadata(row.media_assets);
  const storagePath = nullable(relation.storage_path, 500); const signed = storagePath ? await createSignedMediaUrl(userId, storagePath) : null;
  const mediaType = ["image", "video", "logo"].includes(String(relation.type)) ? String(relation.type) as "image" | "video" | "logo" : "image";
  const status = statuses.includes(row.status as ScheduledPublishStatus) ? row.status as ScheduledPublishStatus : "failed";
  return {
    id: String(row.id), profileId: nullable(row.profile_id), mediaAssetId: String(row.media_asset_id || ""), platforms: list(row.platforms), title: String(row.title || "Planlı paylaşım"),
    caption: String(row.caption || ""), hashtags: list(metadata.hashtags, 30), platformContent: safeMetadata(metadata.platformContent), scheduledAt: String(row.scheduled_at || ""),
    timezone: String(row.timezone || "UTC"), status, lastError: nullable(row.last_error, 1000), publishedAt: nullable(row.published_at),
    accountName: nullable(metadata.accountName), accountUsername: nullable(metadata.accountUsername),
    media: relation.name ? { name: String(relation.name), type: mediaType, signedUrl: signed?.ok ? signed.data.signedUrl : null } : null,
    createdAt: String(row.created_at || ""), updatedAt: String(row.updated_at || ""),
  };
}

async function verifyInput(userId: string, input: ScheduledPublishInput): Promise<Result<{ accountName: string | null; accountUsername: string | null }>> {
  const media = await getMedia(userId, input.mediaAssetId);
  if (!media.ok || (media.data.type !== "image" && media.data.type !== "logo")) return { ok: false, status: 400, error: "Instagram planı için geçerli bir görsel seçmelisin." };
  const connections = await listSocialConnections(userId);
  if (!connections.ok) return { ok: false, status: connections.status, error: connections.error };
  const instagram = connections.data.find((item) => item.platform === "instagram" && item.status === "connected" && item.hasAccessToken);
  if (!instagram) return { ok: false, status: 400, error: "Planlamak için aktif Instagram bağlantısı gerekli." };
  return { ok: true, data: { accountName: instagram.accountName, accountUsername: instagram.accountUsername } };
}

export async function createScheduledPublish(userId: string, input: ScheduledPublishInput): Promise<Result<ScheduledPublish>> {
  const verified = await verifyInput(userId, input); if (!verified.ok) return verified;
  const supabase = getSupabaseServerClient(); if (!supabase) return { ok: false, status: 503, error: "Planlama altyapısı yapılandırılmadı." };
  const metadata = { kind: "scheduled_publish", hashtags: input.hashtags || [], platformContent: input.platformContent || {}, ...verified.data };
  const { data, error } = await supabase.from("content_calendar").insert({ clerk_user_id: userId, profile_id: input.profileId || null, media_asset_id: input.mediaAssetId, title: input.title, caption: input.caption, scheduled_at: input.scheduledAt, timezone: input.timezone, platforms: input.platforms, status: "scheduled", metadata }).select(columns).single();
  if (error || !data) { logError("create", error); return { ok: false, status: 500, error: "Paylaşım planlanamadı." }; }
  return { ok: true, data: await normalize(userId, data as Record<string, unknown>) };
}

export async function listScheduledPublishes(userId: string): Promise<Result<ScheduledPublish[]>> {
  const supabase = getSupabaseServerClient(); if (!supabase) return { ok: false, status: 503, error: "Planlama altyapısı yapılandırılmadı." };
  const { data, error } = await supabase.from("content_calendar").select(columns).eq("clerk_user_id", userId).eq("metadata->>kind", "scheduled_publish").order("scheduled_at", { ascending: true }).limit(200);
  if (error) { logError("list", error); return { ok: false, status: 500, error: "Planlanan paylaşımlar yüklenemedi." }; }
  return { ok: true, data: await Promise.all((data || []).map((row) => normalize(userId, row as Record<string, unknown>))) };
}

export async function getScheduledPublish(userId: string, id: string): Promise<Result<ScheduledPublish>> {
  const supabase = getSupabaseServerClient(); if (!supabase) return { ok: false, status: 503, error: "Planlama altyapısı yapılandırılmadı." };
  const { data, error } = await supabase.from("content_calendar").select(columns).eq("clerk_user_id", userId).eq("id", id).eq("metadata->>kind", "scheduled_publish").maybeSingle();
  if (error) { logError("get", error); return { ok: false, status: 500, error: "Plan yüklenemedi." }; }
  if (!data) return { ok: false, status: 404, error: "Plan bulunamadı." };
  return { ok: true, data: await normalize(userId, data as Record<string, unknown>) };
}

export async function updateScheduledPublish(userId: string, id: string, input: ScheduledPublishInput): Promise<Result<ScheduledPublish>> {
  const existing = await getScheduledPublish(userId, id); if (!existing.ok) return existing;
  if (["processing", "published", "cancelled"].includes(existing.data.status)) return { ok: false, status: 409, error: "İşlenen, yayınlanan veya iptal edilen plan değiştirilemez." };
  const verified = await verifyInput(userId, input); if (!verified.ok) return verified;
  const supabase = getSupabaseServerClient(); if (!supabase) return { ok: false, status: 503, error: "Planlama altyapısı yapılandırılmadı." };
  const metadata = { kind: "scheduled_publish", hashtags: input.hashtags || [], platformContent: input.platformContent || {}, ...verified.data };
  const { data, error } = await supabase.from("content_calendar").update({ profile_id: input.profileId || null, media_asset_id: input.mediaAssetId, title: input.title, caption: input.caption, scheduled_at: input.scheduledAt, timezone: input.timezone, platforms: input.platforms, status: "scheduled", metadata, last_error: null, updated_at: new Date().toISOString() }).eq("clerk_user_id", userId).eq("id", id).in("status", ["scheduled", "failed"]).select(columns).maybeSingle();
  if (error) { logError("update", error); return { ok: false, status: 500, error: "Plan güncellenemedi." }; }
  if (!data) return { ok: false, status: 409, error: "Plan artık değiştirilemiyor." };
  return { ok: true, data: await normalize(userId, data as Record<string, unknown>) };
}

export async function cancelScheduledPublish(userId: string, id: string): Promise<Result<ScheduledPublish>> {
  const supabase = getSupabaseServerClient(); if (!supabase) return { ok: false, status: 503, error: "Planlama altyapısı yapılandırılmadı." };
  const { data, error } = await supabase.from("content_calendar").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("clerk_user_id", userId).eq("id", id).in("status", ["scheduled", "failed"]).eq("metadata->>kind", "scheduled_publish").select(columns).maybeSingle();
  if (error) { logError("cancel", error); return { ok: false, status: 500, error: "Plan iptal edilemedi." }; }
  if (!data) return { ok: false, status: 409, error: "İşlenen veya yayınlanan plan iptal edilemez." };
  return { ok: true, data: await normalize(userId, data as Record<string, unknown>) };
}

export async function listDueScheduledPublishIds(): Promise<string[]> {
  const supabase = getSupabaseServerClient(); if (!supabase) return [];
  const { data, error } = await supabase.from("content_calendar").select("id").eq("status", "scheduled").eq("metadata->>kind", "scheduled_publish").lte("scheduled_at", new Date().toISOString()).order("scheduled_at", { ascending: true }).limit(25);
  if (error) { logError("due", error); return []; }
  return (data || []).map((row) => String(row.id));
}

export async function claimScheduledPublish(id: string, allowedStatuses: Array<"scheduled" | "failed"> = ["scheduled"], expectedUserId?: string): Promise<{ userId: string; item: ScheduledPublish } | null> {
  const supabase = getSupabaseServerClient(); if (!supabase) return null;
  let query = supabase.from("content_calendar").update({ status: "processing", updated_at: new Date().toISOString() }).eq("id", id).in("status", allowedStatuses).eq("metadata->>kind", "scheduled_publish");
  if (expectedUserId) query = query.eq("clerk_user_id", expectedUserId);
  const { data, error } = await query.select(`${columns},clerk_user_id`).maybeSingle();
  if (error) { logError("claim", error); return null; }
  if (!data) return null;
  const userId = String(data.clerk_user_id); return { userId, item: await normalize(userId, data as Record<string, unknown>) };
}

export async function finishScheduledPublish(userId: string, id: string, input: { status: "published" | "failed"; error?: string | null }): Promise<void> {
  const supabase = getSupabaseServerClient(); if (!supabase) return;
  const { error } = await supabase.from("content_calendar").update({ status: input.status, last_error: input.error || null, published_at: input.status === "published" ? new Date().toISOString() : null, updated_at: new Date().toISOString() }).eq("id", id).eq("clerk_user_id", userId).eq("status", "processing");
  if (error) logError("finish", error);
}
