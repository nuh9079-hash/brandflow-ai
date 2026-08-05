import { getMedia } from "@/lib/media/server";
import type { MediaAsset } from "@/lib/media/types";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  calendarPlatforms,
  calendarStatuses,
  type CalendarFilters,
  type CalendarPlatform,
  type CalendarServiceResult,
  type CalendarStatus,
  type ScheduledPost,
  type ScheduledPostInput,
  type ScheduledPostUpdate,
} from "./types";

const tableName = "scheduled_posts";

function calendarError<T>(status = 500, error = "Takvim işlemi tamamlanamadı."): CalendarServiceResult<T> {
  return { ok: false, status, error };
}

function supabaseUnavailable<T>(): CalendarServiceResult<T> {
  return { ok: false, status: 503, error: "Takvim altyapısı yapılandırılmadı." };
}

function nullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isPlatform(value: unknown): value is CalendarPlatform {
  return typeof value === "string" && calendarPlatforms.includes(value as CalendarPlatform);
}

function isStatus(value: unknown): value is CalendarStatus {
  return typeof value === "string" && calendarStatuses.includes(value as CalendarStatus);
}

function normalizeMedia(row: unknown): MediaAsset | null {
  if (!row || typeof row !== "object") return null;
  const media = row as Record<string, unknown>;

  return {
    id: String(media.id),
    clerkUserId: String(media.clerk_user_id),
    profileId: nullableString(media.profile_id),
    type: media.type === "video" || media.type === "logo" ? media.type : "image",
    name: String(media.name ?? ""),
    mimeType: String(media.mime_type ?? ""),
    size: typeof media.size === "number" ? media.size : Number(media.size ?? 0),
    width: typeof media.width === "number" ? media.width : media.width ? Number(media.width) : null,
    height: typeof media.height === "number" ? media.height : media.height ? Number(media.height) : null,
    duration: typeof media.duration === "number" ? media.duration : media.duration ? Number(media.duration) : null,
    storagePath: nullableString(media.storage_path),
    storageUrl: nullableString(media.storage_url),
    isFavorite: Boolean(media.is_favorite),
    createdAt: String(media.created_at ?? ""),
    updatedAt: String(media.updated_at ?? ""),
  };
}

function normalizePost(row: Record<string, unknown>): ScheduledPost {
  return {
    id: String(row.id),
    clerkUserId: String(row.clerk_user_id),
    profileId: nullableString(row.profile_id),
    mediaAssetId: nullableString(row.media_asset_id),
    platform: isPlatform(row.platform) ? row.platform : "instagram",
    status: isStatus(row.status) ? row.status : "draft",
    title: String(row.title ?? ""),
    caption: String(row.caption ?? ""),
    scheduledAt: nullableString(row.scheduled_at),
    timezone: String(row.timezone ?? "UTC"),
    failureReason: nullableString(row.failure_reason),
    publishedAt: nullableString(row.published_at),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
    media: normalizeMedia(row.media_assets),
  };
}

function toRow(userId: string, input: ScheduledPostInput) {
  return {
    clerk_user_id: userId,
    profile_id: input.profileId || null,
    media_asset_id: input.mediaAssetId || null,
    platform: input.platform,
    status: input.status,
    title: input.title,
    caption: input.caption,
    scheduled_at: input.scheduledAt || null,
    timezone: input.timezone,
  };
}

function toUpdateRow(input: ScheduledPostUpdate) {
  return {
    ...("profileId" in input ? { profile_id: input.profileId || null } : {}),
    ...("mediaAssetId" in input ? { media_asset_id: input.mediaAssetId || null } : {}),
    ...(input.platform ? { platform: input.platform } : {}),
    ...(input.status ? { status: input.status } : {}),
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.caption !== undefined ? { caption: input.caption } : {}),
    ...("scheduledAt" in input ? { scheduled_at: input.scheduledAt || null } : {}),
    ...(input.timezone ? { timezone: input.timezone } : {}),
    updated_at: new Date().toISOString(),
  };
}

export function sanitizeScheduledPostInput(body: unknown): ScheduledPostInput | null {
  const input = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const platform = input.platform;
  const status = input.status;
  const title = typeof input.title === "string" ? input.title.trim().slice(0, 140) : "";
  const caption = typeof input.caption === "string" ? input.caption.trim().slice(0, 4000) : "";
  const timezone = typeof input.timezone === "string" && input.timezone.trim() ? input.timezone.trim().slice(0, 80) : "UTC";

  if (!isPlatform(platform) || !isStatus(status) || !title) return null;
  if ((status === "scheduled" || status === "published") && !nullableString(input.scheduledAt)) return null;

  return {
    profileId: nullableString(input.profileId),
    mediaAssetId: nullableString(input.mediaAssetId),
    platform,
    status,
    title,
    caption,
    scheduledAt: nullableString(input.scheduledAt),
    timezone,
  };
}

export function sanitizeScheduledPostUpdate(body: unknown): ScheduledPostUpdate | null {
  const input = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const update: ScheduledPostUpdate = {};

  if ("profileId" in input) update.profileId = nullableString(input.profileId);
  if ("mediaAssetId" in input) update.mediaAssetId = nullableString(input.mediaAssetId);
  if ("platform" in input) {
    if (!isPlatform(input.platform)) return null;
    update.platform = input.platform;
  }
  if ("status" in input) {
    if (!isStatus(input.status)) return null;
    update.status = input.status;
  }
  if ("title" in input) update.title = typeof input.title === "string" ? input.title.trim().slice(0, 140) : "";
  if ("caption" in input) update.caption = typeof input.caption === "string" ? input.caption.trim().slice(0, 4000) : "";
  if ("scheduledAt" in input) update.scheduledAt = nullableString(input.scheduledAt);
  if ("timezone" in input) update.timezone = typeof input.timezone === "string" && input.timezone.trim() ? input.timezone.trim().slice(0, 80) : "UTC";

  if (Object.keys(update).length === 0) return null;
  if (update.status === "scheduled" && "scheduledAt" in update && !update.scheduledAt) return null;

  return update;
}

export function parseCalendarFilters(searchParams: URLSearchParams): CalendarFilters {
  const platform = searchParams.get("platform");
  const status = searchParams.get("status");
  const limit = Number(searchParams.get("limit") || 100);

  return {
    from: nullableString(searchParams.get("from")) || undefined,
    to: nullableString(searchParams.get("to")) || undefined,
    platform: platform === "all" || isPlatform(platform) ? platform : undefined,
    status: status === "all" || isStatus(status) ? status : undefined,
    limit: Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 200) : 100,
  };
}

async function verifyMedia(userId: string, mediaAssetId?: string | null) {
  if (!mediaAssetId) return null;
  const media = await getMedia(userId, mediaAssetId);

  if (!media.ok) return media;
  if (media.data.type !== "image" && media.data.type !== "video") {
    return calendarError(400, "Takvim için yalnızca görsel veya video seçebilirsin.");
  }

  return media;
}

export async function listScheduledPosts(userId: string, filters: CalendarFilters = {}): Promise<CalendarServiceResult<ScheduledPost[]>> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return supabaseUnavailable();

  let query = supabase
    .from(tableName)
    .select("*, media_assets(*)")
    .eq("clerk_user_id", userId)
    .order("scheduled_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (filters.from) query = query.gte("scheduled_at", filters.from);
  if (filters.to) query = query.lte("scheduled_at", filters.to);
  if (filters.platform && filters.platform !== "all") query = query.eq("platform", filters.platform);
  if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);

  const { data, error } = await query.limit(filters.limit ?? 100);

  if (error) return calendarError();

  return { ok: true, data: (data ?? []).map((row) => normalizePost(row as Record<string, unknown>)) };
}

export async function getScheduledPost(userId: string, id: string): Promise<CalendarServiceResult<ScheduledPost>> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return supabaseUnavailable();

  const { data, error } = await supabase
    .from(tableName)
    .select("*, media_assets(*)")
    .eq("clerk_user_id", userId)
    .eq("id", id)
    .maybeSingle();

  if (error) return calendarError();
  if (!data) return calendarError(404, "Plan bulunamadı.");

  return { ok: true, data: normalizePost(data as Record<string, unknown>) };
}

export async function createScheduledPost(userId: string, input: ScheduledPostInput): Promise<CalendarServiceResult<ScheduledPost>> {
  const media = await verifyMedia(userId, input.mediaAssetId);
  if (media && !media.ok) return media;

  const supabase = getSupabaseServerClient();
  if (!supabase) return supabaseUnavailable();

  const { data, error } = await supabase.from(tableName).insert(toRow(userId, input)).select("*, media_assets(*)").single();

  if (error) return calendarError();

  return { ok: true, data: normalizePost(data as Record<string, unknown>) };
}

export async function updateScheduledPost(userId: string, id: string, input: ScheduledPostUpdate): Promise<CalendarServiceResult<ScheduledPost>> {
  if ("mediaAssetId" in input) {
    const media = await verifyMedia(userId, input.mediaAssetId);
    if (media && !media.ok) return media;
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) return supabaseUnavailable();

  const { data, error } = await supabase
    .from(tableName)
    .update(toUpdateRow(input))
    .eq("clerk_user_id", userId)
    .eq("id", id)
    .select("*, media_assets(*)")
    .single();

  if (error) return calendarError();

  return { ok: true, data: normalizePost(data as Record<string, unknown>) };
}

export async function deleteScheduledPost(userId: string, id: string): Promise<CalendarServiceResult<{ deleted: boolean }>> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return supabaseUnavailable();

  const { error } = await supabase.from(tableName).delete().eq("clerk_user_id", userId).eq("id", id);

  if (error) return calendarError();

  return { ok: true, data: { deleted: true } };
}
