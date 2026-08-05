import { getUserBillingPlan } from "@/lib/billing/server";
import type { BillingPlanId } from "@/lib/billing/types";
import type { ContentCalendarStatus } from "@/lib/calendar/content-types";
import type { MediaAssetType } from "@/lib/media/types";
import type { SocialPlatform } from "@/lib/social/connections";
import { socialPlatforms } from "@/lib/social/connections";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type TrendPoint = { date: string; value: number };
export type DistributionPoint = { label: string; value: number };
export type AnalyticsOverview = {
  generatedAt: string;
  metrics: {
    totalImages: number;
    totalVideos: number;
    scheduledPosts: number;
    publishedPosts: number;
    connectedAccounts: number;
    storageUsed: number;
    subscriptionPlan: BillingPlanId;
    subscriptionPlanName: string;
    remainingUsage: { images: number | null; videos: number | null };
  };
  charts: {
    contentTrend: TrendPoint[];
    platformUsage: DistributionPoint[];
    mediaTypes: DistributionPoint[];
    scheduleStatuses: DistributionPoint[];
  };
  recentActivity: Array<{ id: string; kind: "media" | "calendar" | "connection"; title: string; detail: string; occurredAt: string }>;
  upcomingPosts: Array<{ id: string; title: string; platforms: SocialPlatform[]; scheduledAt: string; status: ContentCalendarStatus }>;
  recentMedia: Array<{ id: string; name: string; type: MediaAssetType; size: number; createdAt: string; hasFile: boolean }>;
  externalAnalyticsConnected: false;
};

type Result<T> = { ok: true; data: T } | { ok: false; status: number; error: string };
type Row = Record<string, unknown>;

function platforms(value: unknown): SocialPlatform[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is SocialPlatform => socialPlatforms.includes(item as SocialPlatform));
}

function last30Days(rows: Row[]) {
  const start = new Date(); start.setUTCHours(0, 0, 0, 0); start.setUTCDate(start.getUTCDate() - 29);
  const buckets = new Map<string, number>();
  for (let index = 0; index < 30; index += 1) { const date = new Date(start); date.setUTCDate(start.getUTCDate() + index); buckets.set(date.toISOString().slice(0, 10), 0); }
  for (const row of rows) { const value = typeof row.created_at === "string" ? row.created_at.slice(0, 10) : ""; if (buckets.has(value)) buckets.set(value, (buckets.get(value) || 0) + 1); }
  return Array.from(buckets, ([date, value]) => ({ date, value }));
}

export async function getAnalyticsOverview(userId: string): Promise<Result<AnalyticsOverview>> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { ok: false, status: 503, error: "Analitik verileri için veritabanı bağlantısı yapılandırılmadı." };
  const month = new Date(); month.setUTCDate(1); month.setUTCHours(0, 0, 0, 0);

  const [mediaResult, calendarResult, connectionsResult, usageResult, billing] = await Promise.all([
    supabase.from("media_assets").select("id,type,name,size,storage_path,created_at").eq("clerk_user_id", userId).order("created_at", { ascending: false }).limit(10000),
    supabase.from("content_calendar").select("id,title,status,platforms,scheduled_at,created_at").eq("clerk_user_id", userId).order("created_at", { ascending: false }).limit(10000),
    supabase.from("social_connections").select("id,platform,account_name,account_username,status,updated_at").eq("clerk_user_id", userId).order("updated_at", { ascending: false }).limit(1000),
    supabase.from("billing_usage_monthly").select("ai_images,ai_videos").eq("clerk_user_id", userId).eq("period_start", month.toISOString().slice(0, 10)).maybeSingle(),
    getUserBillingPlan(userId),
  ]);

  const failed = [mediaResult, calendarResult, connectionsResult, usageResult].find((result) => result.error);
  if (failed?.error) { console.error("Analytics query failed:", failed.error.message); return { ok: false, status: 500, error: "Analitik verileri şu anda yüklenemedi." }; }

  const media = (mediaResult.data || []) as Row[]; const calendar = (calendarResult.data || []) as Row[]; const connections = (connectionsResult.data || []) as Row[];
  const images = media.filter((row) => row.type === "image" || row.type === "logo"); const videos = media.filter((row) => row.type === "video");
  const scheduled = calendar.filter((row) => row.status === "scheduled"); const published = calendar.filter((row) => row.status === "published");
  const connected = connections.filter((row) => row.status === "connected");
  const imageUsed = Number(usageResult.data?.ai_images || 0); const videoUsed = Number(usageResult.data?.ai_videos || 0);
  const remaining = (limit: number | null, used: number) => limit === null ? null : Math.max(0, limit - used);
  const platformCounts = new Map<SocialPlatform, number>(socialPlatforms.map((platform) => [platform, 0]));
  calendar.forEach((row) => platforms(row.platforms).forEach((platform) => platformCounts.set(platform, (platformCounts.get(platform) || 0) + 1)));

  const recentActivity = [
    ...media.slice(0, 10).map((row) => ({ id: `media-${row.id}`, kind: "media" as const, title: String(row.name || "Medya"), detail: row.type === "video" ? "Video eklendi" : "Görsel eklendi", occurredAt: String(row.created_at) })),
    ...calendar.slice(0, 10).map((row) => ({ id: `calendar-${row.id}`, kind: "calendar" as const, title: String(row.title || "İçerik planı"), detail: `Takvim durumu: ${String(row.status)}`, occurredAt: String(row.created_at) })),
    ...connections.slice(0, 10).map((row) => ({ id: `connection-${row.id}`, kind: "connection" as const, title: String(row.account_name || row.account_username || row.platform), detail: `Bağlantı durumu: ${String(row.status)}`, occurredAt: String(row.updated_at) })),
  ].filter((item) => !Number.isNaN(Date.parse(item.occurredAt))).sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt)).slice(0, 10);

  return { ok: true, data: {
    generatedAt: new Date().toISOString(),
    metrics: { totalImages: images.length, totalVideos: videos.length, scheduledPosts: scheduled.length, publishedPosts: published.length, connectedAccounts: connected.length, storageUsed: media.reduce((sum, row) => sum + Number(row.size || 0), 0), subscriptionPlan: billing.subscription.plan, subscriptionPlanName: billing.plan.name, remainingUsage: { images: remaining(billing.plan.imageLimit, imageUsed), videos: remaining(billing.plan.videoLimit, videoUsed) } },
    charts: { contentTrend: last30Days(media), platformUsage: Array.from(platformCounts, ([label, value]) => ({ label, value })), mediaTypes: [{ label: "Görseller", value: images.length }, { label: "Videolar", value: videos.length }], scheduleStatuses: [{ label: "scheduled", value: scheduled.length }, { label: "published", value: published.length }] },
    recentActivity,
    upcomingPosts: scheduled.filter((row) => Date.parse(String(row.scheduled_at)) >= Date.now()).sort((a, b) => Date.parse(String(a.scheduled_at)) - Date.parse(String(b.scheduled_at))).slice(0, 6).map((row) => ({ id: String(row.id), title: String(row.title || "Plan"), platforms: platforms(row.platforms), scheduledAt: String(row.scheduled_at), status: "scheduled" })),
    recentMedia: media.slice(0, 6).map((row) => ({ id: String(row.id), name: String(row.name || "Medya"), type: row.type === "video" || row.type === "logo" ? row.type : "image", size: Number(row.size || 0), createdAt: String(row.created_at), hasFile: typeof row.storage_path === "string" && Boolean(row.storage_path) })),
    externalAnalyticsConnected: false,
  } };
}
