import { getSupabaseServerClient } from "@/lib/supabase/server";
import { createSignedMediaUrl } from "@/lib/media/storage";
import type { DraftPlatformContent, PublishDraft, SaveDraftInput } from "@/lib/drafts/types";

type DraftResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };
const allowedPlatforms = new Set(["instagram", "tiktok", "facebook", "twitter", "linkedIn", "youtubeShorts"]);

function text(value: unknown, max: number) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }
function nullable(value: unknown, max = 120) { const result = text(value, max); return result || null; }

function logDraftError(operation: string, error: unknown) {
  const value = error && typeof error === "object" ? error as Record<string, unknown> : {};
  console.error(`Supabase drafts error [${operation}]`, { code: value.code ?? null, message: value.message ?? String(error), details: value.details ?? null, hint: value.hint ?? null });
}

function stringList(value: unknown, maxItems: number, maxLength: number) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map((item) => text(item, maxLength)).filter(Boolean))).slice(0, maxItems);
}

function platformContent(value: unknown): Record<string, DraftPlatformContent> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const output: Record<string, DraftPlatformContent> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!allowedPlatforms.has(key) || !raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const item = raw as Record<string, unknown>;
    output[key] = {
      text: text(item.text, 5000), hashtags: stringList(item.hashtags, 30, 100),
      visualPrompt: text(item.visualPrompt, 3000), videoIdea: text(item.videoIdea, 3000),
    };
  }
  return output;
}

export function sanitizeDraftInput(value: unknown): DraftResult<SaveDraftInput> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false, status: 400, error: "Taslak bilgileri geçersiz." };
  const raw = value as Record<string, unknown>;
  const selectedPlatforms = stringList(raw.selectedPlatforms, 6, 40).filter((item) => allowedPlatforms.has(item));
  const content = platformContent(raw.platformContent);
  if (!selectedPlatforms.length) return { ok: false, status: 400, error: "Taslak için en az bir platform gerekli." };
  const settings = raw.platformSettings && typeof raw.platformSettings === "object" && !Array.isArray(raw.platformSettings) ? raw.platformSettings as Record<string, unknown> : {};
  return { ok: true, data: {
    id: nullable(raw.id) ?? undefined, profileId: nullable(raw.profileId), sourceContentId: nullable(raw.sourceContentId), mediaAssetId: nullable(raw.mediaAssetId),
    name: text(raw.name, 160) || "İsimsiz taslak", selectedPlatforms, caption: text(raw.caption, 5000),
    hashtags: stringList(raw.hashtags, 30, 100), platformContent: content, platformSettings: settings,
  } };
}

async function normalizeDraft(userId: string, row: Record<string, unknown>): Promise<PublishDraft> {
  const relation = row.media_assets && typeof row.media_assets === "object" && !Array.isArray(row.media_assets) ? row.media_assets as Record<string, unknown> : null;
  const storagePath = relation ? nullable(relation.storage_path, 500) : null;
  const signed = storagePath ? await createSignedMediaUrl(userId, storagePath) : null;
  const type = relation && ["image", "video", "logo"].includes(String(relation.type)) ? String(relation.type) as "image" | "video" | "logo" : "image";
  return {
    id: String(row.id), profileId: nullable(row.profile_id), sourceContentId: nullable(row.source_content_id), mediaAssetId: nullable(row.media_asset_id),
    name: String(row.name || "İsimsiz taslak"), selectedPlatforms: stringList(row.selected_platforms, 6, 40), caption: String(row.caption || ""),
    hashtags: stringList(row.hashtags, 30, 100), platformContent: platformContent(row.platform_content),
    platformSettings: row.platform_settings && typeof row.platform_settings === "object" ? row.platform_settings as Record<string, unknown> : {},
    media: relation ? { name: String(relation.name || "Medya"), type, signedUrl: signed?.ok ? signed.data.signedUrl : null } : null,
    createdAt: String(row.created_at || ""), updatedAt: String(row.updated_at || ""),
  };
}

const selectColumns = "id,profile_id,source_content_id,media_asset_id,name,selected_platforms,caption,hashtags,platform_content,platform_settings,created_at,updated_at,media_assets(name,type,storage_path)";

export async function listDrafts(userId: string): Promise<DraftResult<PublishDraft[]>> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { ok: false, status: 503, error: "Taslak altyapısı yapılandırılmadı." };
  const { data, error } = await supabase.from("drafts").select(selectColumns).eq("clerk_user_id", userId).order("updated_at", { ascending: false });
  if (error) { logDraftError("list", error); return { ok: false, status: error.code === "PGRST205" ? 503 : 500, error: error.code === "PGRST205" ? "Taslak tablosu henüz kurulmamış." : "Taslaklar yüklenemedi." }; }
  return { ok: true, data: await Promise.all((data || []).map((row) => normalizeDraft(userId, row as Record<string, unknown>))) };
}

export async function getDraft(userId: string, id: string): Promise<DraftResult<PublishDraft>> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { ok: false, status: 503, error: "Taslak altyapısı yapılandırılmadı." };
  const { data, error } = await supabase.from("drafts").select(selectColumns).eq("clerk_user_id", userId).eq("id", id).maybeSingle();
  if (error) { logDraftError("get", error); return { ok: false, status: 500, error: "Taslak yüklenemedi." }; }
  if (!data) return { ok: false, status: 404, error: "Taslak bulunamadı." };
  return { ok: true, data: await normalizeDraft(userId, data as Record<string, unknown>) };
}

export async function getLatestDraft(userId: string): Promise<DraftResult<PublishDraft | null>> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { ok: false, status: 503, error: "Taslak altyapısı yapılandırılmadı." };
  const { data, error } = await supabase.from("drafts").select(selectColumns).eq("clerk_user_id", userId).order("updated_at", { ascending: false }).limit(1).maybeSingle();
  if (error) { logDraftError("latest", error); return { ok: false, status: error.code === "PGRST205" ? 503 : 500, error: "Son taslak yüklenemedi." }; }
  return { ok: true, data: data ? await normalizeDraft(userId, data as Record<string, unknown>) : null };
}

export async function saveDraft(userId: string, input: SaveDraftInput): Promise<DraftResult<PublishDraft>> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { ok: false, status: 503, error: "Taslak altyapısı yapılandırılmadı." };
  const values = { clerk_user_id: userId, profile_id: input.profileId || null, source_content_id: input.sourceContentId || null, media_asset_id: input.mediaAssetId || null, name: input.name, selected_platforms: input.selectedPlatforms, caption: input.caption, hashtags: input.hashtags, platform_content: input.platformContent, platform_settings: input.platformSettings || {}, updated_at: new Date().toISOString() };
  const query = input.id
    ? supabase.from("drafts").update(values).eq("id", input.id).eq("clerk_user_id", userId)
    : supabase.from("drafts").insert(values);
  const { data, error } = await query.select(selectColumns).maybeSingle();
  if (error) { logDraftError(input.id ? "update" : "create", error); return { ok: false, status: 500, error: "Taslak kaydedilemedi." }; }
  if (!data) return { ok: false, status: 404, error: "Güncellenecek taslak bulunamadı." };
  return { ok: true, data: await normalizeDraft(userId, data as Record<string, unknown>) };
}

export async function deleteDraft(userId: string, id: string): Promise<DraftResult<{ deleted: true }>> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { ok: false, status: 503, error: "Taslak altyapısı yapılandırılmadı." };
  const { data, error } = await supabase.from("drafts").delete().eq("id", id).eq("clerk_user_id", userId).select("id").maybeSingle();
  if (error) { logDraftError("delete", error); return { ok: false, status: 500, error: "Taslak silinemedi." }; }
  if (!data) return { ok: false, status: 404, error: "Taslak bulunamadı." };
  return { ok: true, data: { deleted: true } };
}
