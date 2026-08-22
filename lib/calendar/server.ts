import { getMedia } from "@/lib/media/server";
import type { MediaAsset } from "@/lib/media/types";
import { getSocialConnection } from "@/lib/social/connections";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  automaticPublishPlatforms,
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
    autoPublish: row.auto_publish === true,
    attemptCount: Number(row.attempt_count ?? 0),
    lastAttemptAt: nullableString(row.last_attempt_at),
    nextAttemptAt: nullableString(row.next_attempt_at),
    failureReason: nullableString(row.failure_reason),
    publishedAt: nullableString(row.published_at),
    externalPostId: nullableString(row.external_post_id),
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
    auto_publish: input.autoPublish,
    attempt_count: 0,
    last_attempt_at: null,
    next_attempt_at: null,
    processing_started_at: null,
    failure_reason: null,
  };
}

function toUpdateRow(input: ScheduledPostUpdate) {
  const schedulingChanged = "scheduledAt" in input || "platform" in input || "mediaAssetId" in input || "autoPublish" in input;
  return {
    ...("profileId" in input ? { profile_id: input.profileId || null } : {}),
    ...("mediaAssetId" in input ? { media_asset_id: input.mediaAssetId || null } : {}),
    ...(input.platform ? { platform: input.platform } : {}),
    ...(input.status ? { status: input.status } : {}),
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.caption !== undefined ? { caption: input.caption } : {}),
    ...("scheduledAt" in input ? { scheduled_at: input.scheduledAt || null } : {}),
    ...(input.timezone ? { timezone: input.timezone } : {}),
    ...("autoPublish" in input ? { auto_publish: Boolean(input.autoPublish) } : {}),
    ...(schedulingChanged ? { attempt_count: 0, last_attempt_at: null, next_attempt_at: null, processing_started_at: null, failure_reason: null } : {}),
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
  const autoPublish = input.autoPublish === true;

  if (!isPlatform(platform) || !isStatus(status) || !title) return null;
  if ((status === "scheduled" || status === "published") && !nullableString(input.scheduledAt)) return null;
  if (autoPublish && status !== "scheduled") return null;

  return {
    profileId: nullableString(input.profileId),
    mediaAssetId: nullableString(input.mediaAssetId),
    platform,
    status,
    title,
    caption,
    scheduledAt: nullableString(input.scheduledAt),
    timezone,
    autoPublish,
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
  if ("autoPublish" in input) update.autoPublish = input.autoPublish === true;

  if (Object.keys(update).length === 0) return null;
  if (update.status === "scheduled" && "scheduledAt" in update && !update.scheduledAt) return null;
  if (update.autoPublish === true && update.status && update.status !== "scheduled") return null;

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

async function verifyAutomaticPublishing(userId: string, input: ScheduledPostInput | (ScheduledPostUpdate & { platform?: CalendarPlatform; status?: CalendarStatus }), current?: ScheduledPost) {
  const autoPublish = "autoPublish" in input ? input.autoPublish : current?.autoPublish;
  if (!autoPublish) return null;

  const platform = input.platform || current?.platform;
  const status = input.status || current?.status;
  const mediaAssetId = "mediaAssetId" in input ? input.mediaAssetId : current?.mediaAssetId;
  const caption = input.caption !== undefined ? input.caption : current?.caption || "";

  if (!platform || !automaticPublishPlatforms.includes(platform)) {
    return calendarError(400, "Bu platformda otomatik yayın henüz etkin değil. İstersen takvime manuel hatırlatma olarak kaydedebilirsin.");
  }
  if (status !== "scheduled") {
    return calendarError(400, "Otomatik yayın yalnızca planlanmış gönderilerde kullanılabilir.");
  }
  if (platform === "instagram" && !mediaAssetId) {
    return calendarError(400, "Instagram otomatik yayını için bir görsel veya video seçmelisin.");
  }
  if (platform === "facebook" && !mediaAssetId && !caption.trim()) {
    return calendarError(400, "Facebook otomatik yayını için metin veya medya eklemelisin.");
  }

  const connection = await getSocialConnection(userId, platform);
  if (!connection) {
    return calendarError(409, `${platform === "instagram" ? "Instagram" : "Facebook"} hesabı otomatik yayın için bağlı değil. Önce Sosyal Hesaplar bölümünden hesabını bağla.`);
  }
  return null;
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
  const autoCheck = await verifyAutomaticPublishing(userId, input);
  if (autoCheck) return autoCheck;

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

  const current = await getScheduledPost(userId, id);
  if (!current.ok) return current;
  const autoCheck = await verifyAutomaticPublishing(userId, input, current.data);
  if (autoCheck) return autoCheck;

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
