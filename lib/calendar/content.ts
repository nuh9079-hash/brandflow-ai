import { getMedia } from "@/lib/media/server";
import type { MediaAsset } from "@/lib/media/types";
import { socialPlatforms, type SocialPlatform } from "@/lib/social/connections";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { ContentCalendarInput, ContentCalendarItem, ContentCalendarResult, ContentCalendarStatus, ContentCalendarUpdate } from "./content-types";

const tableName = "content_calendar";
const statuses: ContentCalendarStatus[] = ["draft", "scheduled", "publishing", "published", "failed"];

function fail<T>(status: number, error: string): ContentCalendarResult<T> { return { ok: false, status, error }; }
function text(value: unknown, max: number) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }
function nullable(value: unknown) { const result = text(value, 100); return result || null; }
function isStatus(value: unknown): value is ContentCalendarStatus { return typeof value === "string" && statuses.includes(value as ContentCalendarStatus); }
function isUserStatus(value: unknown): value is "draft" | "scheduled" { return value === "draft" || value === "scheduled"; }
function platformList(value: unknown): SocialPlatform[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is SocialPlatform => socialPlatforms.includes(item as SocialPlatform)))];
}

function normalizeMedia(value: unknown): MediaAsset | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  return {
    id: String(row.id), clerkUserId: String(row.clerk_user_id), profileId: nullable(row.profile_id),
    type: row.type === "video" || row.type === "logo" ? row.type : "image", name: String(row.name || ""),
    mimeType: String(row.mime_type || ""), size: Number(row.size || 0), width: row.width == null ? null : Number(row.width),
    height: row.height == null ? null : Number(row.height), duration: row.duration == null ? null : Number(row.duration),
    storagePath: nullable(row.storage_path), storageUrl: nullable(row.storage_url), isFavorite: Boolean(row.is_favorite),
    createdAt: String(row.created_at || ""), updatedAt: String(row.updated_at || ""),
  };
}

function normalize(row: Record<string, unknown>): ContentCalendarItem {
  return {
    id: String(row.id), profileId: nullable(row.profile_id), mediaAssetId: nullable(row.media_asset_id),
    title: String(row.title || ""), caption: String(row.caption || ""), scheduledAt: String(row.scheduled_at || ""),
    timezone: String(row.timezone || "UTC"), platforms: platformList(row.platforms),
    status: isStatus(row.status) ? row.status : "draft", createdAt: String(row.created_at || ""),
    updatedAt: String(row.updated_at || ""), media: normalizeMedia(row.media_assets),
  };
}

function parseDate(value: unknown) {
  const raw = text(value, 80);
  if (!raw) return "";
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

export function sanitizeContentInput(body: unknown): ContentCalendarInput | null {
  const raw = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const title = text(raw.title, 140); const scheduledAt = parseDate(raw.scheduledAt); const platforms = platformList(raw.platforms);
  if (!title || !scheduledAt || !isUserStatus(raw.status) || platforms.length === 0) return null;
  return { profileId: nullable(raw.profileId), mediaAssetId: nullable(raw.mediaAssetId), title, caption: text(raw.caption, 5000), scheduledAt, timezone: text(raw.timezone, 80) || "UTC", platforms, status: raw.status };
}

export function sanitizeContentUpdate(body: unknown): ContentCalendarUpdate | null {
  const raw = body && typeof body === "object" ? body as Record<string, unknown> : {}; const update: ContentCalendarUpdate = {};
  if ("profileId" in raw) update.profileId = nullable(raw.profileId);
  if ("mediaAssetId" in raw) update.mediaAssetId = nullable(raw.mediaAssetId);
  if ("title" in raw) { update.title = text(raw.title, 140); if (!update.title) return null; }
  if ("caption" in raw) update.caption = text(raw.caption, 5000);
  if ("scheduledAt" in raw) { update.scheduledAt = parseDate(raw.scheduledAt); if (!update.scheduledAt) return null; }
  if ("timezone" in raw) update.timezone = text(raw.timezone, 80) || "UTC";
  if ("platforms" in raw) { update.platforms = platformList(raw.platforms); if (update.platforms.length === 0) return null; }
  if ("status" in raw) { if (!isUserStatus(raw.status)) return null; update.status = raw.status; }
  return Object.keys(update).length ? update : null;
}

async function verifyMedia(userId: string, id?: string | null) {
  if (!id) return { ok: true as const };
  const media = await getMedia(userId, id);
  return media.ok && (media.data.type === "image" || media.data.type === "video") ? { ok: true as const } : { ok: false as const };
}

async function verifyPlatforms(userId: string, platforms: SocialPlatform[]) {
  const supabase = getSupabaseServerClient(); if (!supabase) return false;
  const { data, error } = await supabase.from("social_connections").select("platform").eq("clerk_user_id", userId).eq("status", "connected").in("platform", platforms);
  if (error) return false;
  const connected = new Set((data || []).map((row) => row.platform));
  return platforms.every((platform) => connected.has(platform));
}

export async function listContent(userId: string, params: URLSearchParams): Promise<ContentCalendarResult<ContentCalendarItem[]>> {
  const supabase = getSupabaseServerClient(); if (!supabase) return fail(503, "Takvim altyapısı yapılandırılmadı.");
  let query = supabase.from(tableName).select("*,media_assets(*)").eq("clerk_user_id", userId).order("scheduled_at", { ascending: true });
  const from = parseDate(params.get("from")); const to = parseDate(params.get("to")); const platform = params.get("platform");
  const status = params.get("status"); const requestedLimit = Number(params.get("limit") || 300); const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 300) : 300;
  if (from) query = query.gte("scheduled_at", from); if (to) query = query.lt("scheduled_at", to);
  if (platform && socialPlatforms.includes(platform as SocialPlatform)) query = query.contains("platforms", [platform]);
  if (status && isStatus(status)) query = query.eq("status", status);
  const { data, error } = await query.limit(limit); if (error) return fail(500, "Takvim yüklenemedi.");
  return { ok: true, data: (data || []).map((row) => normalize(row as Record<string, unknown>)) };
}

export async function createContent(userId: string, input: ContentCalendarInput): Promise<ContentCalendarResult<ContentCalendarItem>> {
  if (!(await verifyMedia(userId, input.mediaAssetId)).ok) return fail(400, "Seçilen medya bulunamadı.");
  if (!(await verifyPlatforms(userId, input.platforms))) return fail(400, "Seçilen platformlardan en az biri bağlı değil.");
  const supabase = getSupabaseServerClient(); if (!supabase) return fail(503, "Takvim altyapısı yapılandırılmadı.");
  const { data, error } = await supabase.from(tableName).insert({ clerk_user_id: userId, profile_id: input.profileId || null, media_asset_id: input.mediaAssetId || null, title: input.title, caption: input.caption, scheduled_at: input.scheduledAt, timezone: input.timezone, platforms: input.platforms, status: input.status }).select("*,media_assets(*)").single();
  return error ? fail(500, "Plan oluşturulamadı.") : { ok: true, data: normalize(data as Record<string, unknown>) };
}

export async function updateContent(userId: string, id: string, input: ContentCalendarUpdate): Promise<ContentCalendarResult<ContentCalendarItem>> {
  if ("mediaAssetId" in input && !(await verifyMedia(userId, input.mediaAssetId)).ok) return fail(400, "Seçilen medya bulunamadı.");
  if (input.platforms && !(await verifyPlatforms(userId, input.platforms))) return fail(400, "Seçilen platformlardan en az biri bağlı değil.");
  const supabase = getSupabaseServerClient(); if (!supabase) return fail(503, "Takvim altyapısı yapılandırılmadı.");
  const row = { ...(input.profileId !== undefined ? { profile_id: input.profileId } : {}), ...(input.mediaAssetId !== undefined ? { media_asset_id: input.mediaAssetId } : {}), ...(input.title !== undefined ? { title: input.title } : {}), ...(input.caption !== undefined ? { caption: input.caption } : {}), ...(input.scheduledAt !== undefined ? { scheduled_at: input.scheduledAt } : {}), ...(input.timezone !== undefined ? { timezone: input.timezone } : {}), ...(input.platforms ? { platforms: input.platforms } : {}), ...(input.status ? { status: input.status } : {}) };
  const { data, error } = await supabase.from(tableName).update(row).eq("clerk_user_id", userId).eq("id", id).select("*,media_assets(*)").maybeSingle();
  if (error) return fail(500, "Plan güncellenemedi."); if (!data) return fail(404, "Plan bulunamadı."); return { ok: true, data: normalize(data as Record<string, unknown>) };
}

export async function deleteContent(userId: string, id: string): Promise<ContentCalendarResult<{ deleted: true }>> {
  const supabase = getSupabaseServerClient(); if (!supabase) return fail(503, "Takvim altyapısı yapılandırılmadı.");
  const { data, error } = await supabase.from(tableName).delete().eq("clerk_user_id", userId).eq("id", id).select("id").maybeSingle();
  if (error) return fail(500, "Plan silinemedi."); if (!data) return fail(404, "Plan bulunamadı."); return { ok: true, data: { deleted: true } };
}

export async function duplicateContent(userId: string, id: string): Promise<ContentCalendarResult<ContentCalendarItem>> {
  const supabase = getSupabaseServerClient(); if (!supabase) return fail(503, "Takvim altyapısı yapılandırılmadı.");
  const { data, error } = await supabase.from(tableName).select("profile_id,media_asset_id,title,caption,scheduled_at,timezone,platforms").eq("clerk_user_id", userId).eq("id", id).maybeSingle();
  if (error || !data) return fail(404, "Plan bulunamadı.");
  return createContent(userId, { profileId: data.profile_id, mediaAssetId: data.media_asset_id, title: `${data.title} (Kopya)`, caption: data.caption, scheduledAt: data.scheduled_at, timezone: data.timezone, platforms: platformList(data.platforms), status: "draft" });
}
