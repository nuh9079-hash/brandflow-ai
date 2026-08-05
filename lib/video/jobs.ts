import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { VideoAspectRatio, VideoStatus } from "./provider";

type VideoJob = {
  providerJobId: string;
  status: VideoStatus;
  prompt: string;
  aspectRatio: VideoAspectRatio;
  duration: number;
  mediaAssetId: string | null;
  error: string | null;
};

function normalize(row: Record<string, unknown>): VideoJob {
  return {
    providerJobId: String(row.provider_job_id),
    status: row.status as VideoStatus,
    prompt: String(row.prompt),
    aspectRatio: row.aspect_ratio as VideoAspectRatio,
    duration: Number(row.duration),
    mediaAssetId: typeof row.media_asset_id === "string" ? row.media_asset_id : null,
    error: typeof row.error === "string" ? row.error : null,
  };
}

export async function createVideoJob(userId: string, input: Omit<VideoJob, "mediaAssetId" | "error"> & { provider: string }) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { ok: false as const, error: "Video işi kaydedilemedi." };
  const { error } = await supabase.from("video_generation_jobs").insert({
    clerk_user_id: userId,
    provider: input.provider,
    provider_job_id: input.providerJobId,
    status: input.status,
    prompt: input.prompt,
    aspect_ratio: input.aspectRatio,
    duration: input.duration,
  });
  return error ? { ok: false as const, error: "Video işi kaydedilemedi." } : { ok: true as const };
}

export async function getVideoJob(userId: string, providerJobId: string) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { ok: false as const, status: 503, error: "Video işi altyapısı yapılandırılmadı." };
  const { data, error } = await supabase.from("video_generation_jobs").select("*").eq("clerk_user_id", userId).eq("provider_job_id", providerJobId).maybeSingle();
  if (error) return { ok: false as const, status: 500, error: "Video işi okunamadı." };
  if (!data) return { ok: false as const, status: 404, error: "Video işi bulunamadı." };
  return { ok: true as const, data: normalize(data as Record<string, unknown>) };
}

export async function updateVideoJob(userId: string, providerJobId: string, input: { status: VideoStatus; mediaAssetId?: string; error?: string }) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { ok: false as const, error: "Video işi güncellenemedi." };
  const { error } = await supabase.from("video_generation_jobs").update({
    status: input.status,
    ...(input.mediaAssetId ? { media_asset_id: input.mediaAssetId } : {}),
    ...(input.error ? { error: input.error } : {}),
    updated_at: new Date().toISOString(),
  }).eq("clerk_user_id", userId).eq("provider_job_id", providerJobId);
  return error ? { ok: false as const, error: "Video işi güncellenemedi." } : { ok: true as const };
}
