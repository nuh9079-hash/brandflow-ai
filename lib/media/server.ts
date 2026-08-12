import { getSupabaseServerClient } from "@/lib/supabase/server";
import type {
  CreateMediaInput,
  MediaAsset,
  MediaFilters,
  MediaServiceResult,
  UpdateMediaInput,
} from "@/lib/media/types";
import { isMimeAllowed, mediaLimitForType } from "@/lib/media/validation";

const tableName = "media_assets";

function serviceError(status = 500, error = "Medya işlemi tamamlanamadı."): MediaServiceResult<never> {
  return { ok: false, status, error };
}

function supabaseUnavailable<T>(): MediaServiceResult<T> {
  return { ok: false, status: 503, error: "Medya altyapısı yapılandırılmadı." };
}

function toNullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function toNullableNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeMedia(row: Record<string, unknown>): MediaAsset {
  return {
    id: String(row.id),
    clerkUserId: String(row.clerk_user_id),
    profileId: toNullableString(row.profile_id),
    type: row.type === "video" || row.type === "logo" ? row.type : "image",
    name: String(row.name ?? ""),
    mimeType: String(row.mime_type ?? ""),
    size: typeof row.size === "number" ? row.size : Number(row.size ?? 0),
    width: toNullableNumber(row.width),
    height: toNullableNumber(row.height),
    duration: toNullableNumber(row.duration),
    storagePath: toNullableString(row.storage_path),
    storageUrl: toNullableString(row.storage_url),
    isFavorite: Boolean(row.is_favorite),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

function viewedMediaId(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") return null;
  return toNullableString((metadata as Record<string, unknown>).mediaId);
}

async function viewedMediaMap(userId: string) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { ok: false as const };

  const { data, error } = await supabase
    .from("history")
    .select("metadata, created_at")
    .eq("user_id", userId)
    .eq("action", "media_viewed")
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error) return { ok: false as const };

  const viewed = new Map<string, string>();
  for (const row of data ?? []) {
    const mediaId = viewedMediaId(row.metadata);
    if (mediaId && !viewed.has(mediaId)) viewed.set(mediaId, String(row.created_at));
  }

  return { ok: true as const, data: viewed };
}

function toInsertRow(userId: string, input: CreateMediaInput) {
  return {
    clerk_user_id: userId,
    profile_id: input.profileId || null,
    type: input.type,
    name: input.name,
    mime_type: input.mimeType,
    size: input.size,
    width: input.width ?? null,
    height: input.height ?? null,
    duration: input.duration ?? null,
    storage_path: input.storagePath || null,
    storage_url: input.storageUrl || null,
  };
}

export async function listMedia(userId: string, filters: MediaFilters = {}): Promise<MediaServiceResult<MediaAsset[]>> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return supabaseUnavailable();

  let query = supabase.from(tableName).select("*").eq("clerk_user_id", userId);

  if (filters.type) query = query.eq("type", filters.type);
  if (filters.profileId) query = query.eq("profile_id", filters.profileId);
  if (filters.search) query = query.ilike("name", `%${filters.search}%`);

  if (filters.sort === "oldest") {
    query = query.order("created_at", { ascending: true });
  } else if (filters.sort === "largest") {
    query = query.order("size", { ascending: false });
  } else if (filters.sort === "smallest") {
    query = query.order("size", { ascending: true });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data, error } = await query.limit(200);

  if (error) return serviceError();

  const viewed = await viewedMediaMap(userId);
  if (!viewed.ok) return serviceError();

  return {
    ok: true,
    data: (data ?? []).map((row) => {
      const media = normalizeMedia(row as Record<string, unknown>);
      return { ...media, viewedAt: viewed.data.get(media.id) ?? null };
    }),
  };
}

export async function getMedia(userId: string, mediaId: string): Promise<MediaServiceResult<MediaAsset>> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return supabaseUnavailable();

  const { data, error } = await supabase
    .from(tableName)
    .select("*")
    .eq("clerk_user_id", userId)
    .eq("id", mediaId)
    .maybeSingle();

  if (error) return serviceError();
  if (!data) return serviceError(404, "Medya bulunamadı.");

  const media = normalizeMedia(data as Record<string, unknown>);
  const viewed = await viewedMediaMap(userId);
  if (!viewed.ok) return serviceError();

  return { ok: true, data: { ...media, viewedAt: viewed.data.get(media.id) ?? null } };
}

export async function createMedia(userId: string, input: CreateMediaInput): Promise<MediaServiceResult<MediaAsset>> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return supabaseUnavailable();

  const { data, error } = await supabase.from(tableName).insert(toInsertRow(userId, input)).select("*").single();

  if (error) return serviceError();

  return { ok: true, data: normalizeMedia(data as Record<string, unknown>) };
}

export async function updateMedia(userId: string, mediaId: string, input: UpdateMediaInput): Promise<MediaServiceResult<MediaAsset>> {
  const current = await getMedia(userId, mediaId);
  if (!current.ok) return current;

  const nextType = input.type ?? current.data.type;

  if (!isMimeAllowed(nextType, current.data.mimeType) || current.data.size > mediaLimitForType(nextType)) {
    return serviceError(400, "Medya tipi dosya ile uyumlu değil.");
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) return supabaseUnavailable();

  if (input.viewedAt && !current.data.viewedAt) {
    const { error: viewedError } = await supabase.from("history").insert({
      user_id: userId,
      content_id: null,
      action: "media_viewed",
      metadata: { mediaId },
      created_at: input.viewedAt,
    });

    if (viewedError) return serviceError();
  }

  const hasMediaUpdate = Boolean(
    input.name || input.type || "profileId" in input || "isFavorite" in input
  );
  if (!hasMediaUpdate) return getMedia(userId, mediaId);

  const updateRow = {
    ...(input.name ? { name: input.name } : {}),
    ...(input.type ? { type: input.type } : {}),
    ...("profileId" in input ? { profile_id: input.profileId || null } : {}),
    ...("isFavorite" in input ? { is_favorite: Boolean(input.isFavorite) } : {}),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from(tableName)
    .update(updateRow)
    .eq("clerk_user_id", userId)
    .eq("id", mediaId)
    .select("*")
    .single();

  if (error) return serviceError();

  return { ok: true, data: normalizeMedia(data as Record<string, unknown>) };
}

export async function updateMediaStorage(userId: string, mediaId: string, storagePath: string): Promise<MediaServiceResult<MediaAsset>> {
  const current = await getMedia(userId, mediaId);
  if (!current.ok) return current;

  const supabase = getSupabaseServerClient();
  if (!supabase) return supabaseUnavailable();

  const { data, error } = await supabase
    .from(tableName)
    .update({ storage_path: storagePath, updated_at: new Date().toISOString() })
    .eq("clerk_user_id", userId)
    .eq("id", mediaId)
    .select("*")
    .single();

  if (error) return serviceError();

  return { ok: true, data: normalizeMedia(data as Record<string, unknown>) };
}

export async function deleteMedia(userId: string, mediaId: string): Promise<MediaServiceResult<{ deleted: boolean }>> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return supabaseUnavailable();

  const { error } = await supabase.from(tableName).delete().eq("clerk_user_id", userId).eq("id", mediaId);

  if (error) return serviceError();

  return { ok: true, data: { deleted: true } };
}
