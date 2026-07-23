import { getSupabaseServerClient } from "@/lib/supabase/server";
import { mediaBucketName, type MediaServiceResult } from "@/lib/media/types";

function safePathSegment(value: string) {
  return value
    .trim()
    .replace(/[\\/]+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 180);
}

function userMediaPrefix(userId: string) {
  return `media/${safePathSegment(userId)}/`;
}

export function createUploadPath(userId: string, mediaId: string, filename: string) {
  const safeFilename = safePathSegment(filename) || "media-file";
  return `${userMediaPrefix(userId)}${safePathSegment(mediaId)}/${safeFilename}`;
}

export function isOwnedStoragePath(userId: string, storagePath: string | null | undefined) {
  return Boolean(storagePath && storagePath.startsWith(userMediaPrefix(userId)));
}

export async function createSignedUpload(userId: string, storagePath: string): Promise<MediaServiceResult<{ signedUrl: string; path: string; token?: string }>> {
  if (!isOwnedStoragePath(userId, storagePath)) {
    return { ok: false, status: 404, error: "Medya bulunamadı." };
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return { ok: false, status: 503, error: "Medya depolama yapılandırılmadı." };
  }

  const { data, error } = await supabase.storage.from(mediaBucketName).createSignedUploadUrl(storagePath);

  if (error || !data?.signedUrl) {
    return { ok: false, status: 503, error: "Medya yükleme bağlantısı oluşturulamadı." };
  }

  return {
    ok: true,
    data: {
      signedUrl: data.signedUrl,
      path: data.path,
      token: "token" in data && typeof data.token === "string" ? data.token : undefined,
    },
  };
}

export async function createSignedMediaUrl(userId: string, storagePath: string): Promise<MediaServiceResult<{ signedUrl: string }>> {
  if (!isOwnedStoragePath(userId, storagePath)) {
    return { ok: false, status: 404, error: "Medya bulunamadı." };
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return { ok: false, status: 503, error: "Medya depolama yapılandırılmadı." };
  }

  const { data, error } = await supabase.storage.from(mediaBucketName).createSignedUrl(storagePath, 60 * 10);

  if (error || !data?.signedUrl) {
    return { ok: false, status: 503, error: "Medya görüntüleme bağlantısı oluşturulamadı." };
  }

  return { ok: true, data: { signedUrl: data.signedUrl } };
}

export async function deleteStoredFile(userId: string, storagePath: string): Promise<MediaServiceResult<{ deleted: boolean }>> {
  if (!isOwnedStoragePath(userId, storagePath)) {
    return { ok: false, status: 404, error: "Medya bulunamadı." };
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return { ok: false, status: 503, error: "Medya depolama yapılandırılmadı." };
  }

  const { error } = await supabase.storage.from(mediaBucketName).remove([storagePath]);

  if (error) {
    return { ok: true, data: { deleted: false } };
  }

  return { ok: true, data: { deleted: true } };
}
