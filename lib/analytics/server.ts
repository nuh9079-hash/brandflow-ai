import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { AdvisorPlatform } from "@/lib/marketing/advisor";
import type { CalendarPlatform, CalendarStatus } from "@/lib/calendar/types";

export type AnalyticsRange = "7d" | "30d" | "90d" | "all";
export type AnalyticsPlatform = CalendarPlatform | "all";

export type AnalyticsFilters = {
  range: AnalyticsRange;
  profileId: string | null;
  platform: AnalyticsPlatform;
};

export type TrendPoint = { date: string; value: number };
export type DistributionPoint = { label: string; value: number };

export type AnalyticsOverview = {
  generatedAt: string;
  filters: AnalyticsFilters;
  metrics: {
    totalMedia: number;
    totalImages: number;
    totalVideos: number;
    totalScheduledPosts: number;
    postStatuses: Record<CalendarStatus, number>;
    averageAdvisorScore: number | null;
    advisorReports: number;
    mostUsedPlatform: CalendarPlatform | null;
    mostActiveProfile: { id: string; name: string; count: number } | null;
    mediaLast7Days: number;
    mediaLast30Days: number;
  };
  charts: {
    mediaTrend: TrendPoint[];
    postStatusDistribution: DistributionPoint[];
    platformDistribution: DistributionPoint[];
    advisorScoreTrend: TrendPoint[];
  };
  upcomingPosts: Array<{ id: string; title: string; platform: CalendarPlatform; scheduledAt: string; status: CalendarStatus }>;
  recentMedia: Array<{ id: string; name: string; type: "image" | "video" | "logo"; size: number; createdAt: string }>;
  recentRecommendations: Array<{ id: string; platform: AdvisorPlatform; score: number; recommendation: string; createdAt: string }>;
  profiles: Array<{ id: string; name: string }>;
  externalAnalyticsConnected: false;
};

type Result<T> = { ok: true; data: T } | { ok: false; status: number; error: string };
type Row = Record<string, unknown>;

const platforms: CalendarPlatform[] = ["instagram", "facebook", "twitter", "tiktok", "linkedin"];
const statuses: CalendarStatus[] = ["draft", "scheduled", "published", "failed"];

function validDate(value: unknown) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value : "";
}

function startForRange(range: AnalyticsRange) {
  if (range === "all") return null;
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - (days - 1));
  return date.toISOString();
}

function countBy<T extends string>(rows: Row[], key: string, values: readonly T[]): Record<T, number> {
  return Object.fromEntries(values.map((value) => [value, rows.filter((row) => row[key] === value).length])) as Record<T, number>;
}

function dateKey(value: string) {
  return value.slice(0, 10);
}

function dailyTrend(rows: Row[], dateField: string, value?: (row: Row) => number | null): TrendPoint[] {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - 29);
  const buckets = new Map<string, number[]>();

  for (let index = 0; index < 30; index += 1) {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    buckets.set(date.toISOString().slice(0, 10), []);
  }

  rows.forEach((row) => {
    const date = validDate(row[dateField]);
    if (!date) return;
    const key = dateKey(date);
    if (!buckets.has(key)) return;
    buckets.get(key)?.push(value ? value(row) ?? 0 : 1);
  });

  return Array.from(buckets, ([date, values]) => ({
    date,
    value: value ? (values.length ? Math.round(values.reduce((sum, item) => sum + item, 0) / values.length) : 0) : values.length,
  }));
}

function analysisScore(row: Row) {
  const analysis = row.analysis;
  if (!analysis || typeof analysis !== "object") return null;
  const score = Number((analysis as Row).overallScore);
  return Number.isFinite(score) ? Math.min(100, Math.max(0, score)) : null;
}

function recommendation(row: Row) {
  const analysis = row.analysis;
  if (!analysis || typeof analysis !== "object") return "Yeni analiz önerisi";
  const value = (analysis as Row).suggestedCampaignObjective;
  return typeof value === "string" && value.trim() ? value : "Yeni analiz önerisi";
}

export function parseAnalyticsFilters(params: URLSearchParams): AnalyticsFilters {
  const rangeValue = params.get("range");
  const platformValue = params.get("platform");
  return {
    range: rangeValue === "7d" || rangeValue === "90d" || rangeValue === "all" ? rangeValue : "30d",
    profileId: params.get("profileId")?.trim() || null,
    platform: platformValue && platforms.includes(platformValue as CalendarPlatform) ? (platformValue as CalendarPlatform) : "all",
  };
}

export async function getAnalyticsOverview(userId: string, filters: AnalyticsFilters): Promise<Result<AnalyticsOverview>> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { ok: false, status: 503, error: "Analitik verileri için veritabanı bağlantısı yapılandırılmadı." };

  const from = startForRange(filters.range);
  const mediaSince30 = new Date();
  mediaSince30.setUTCHours(0, 0, 0, 0);
  mediaSince30.setUTCDate(mediaSince30.getUTCDate() - 29);

  let mediaQuery = supabase.from("media_assets").select("id,profile_id,type,name,size,created_at").eq("clerk_user_id", userId);
  let postsQuery = supabase.from("scheduled_posts").select("id,profile_id,platform,status,title,scheduled_at,created_at").eq("clerk_user_id", userId);
  let reportsQuery = supabase.from("marketing_advisor_reports").select("id,profile_id,platform,analysis,created_at").eq("clerk_user_id", userId);

  if (from) {
    mediaQuery = mediaQuery.gte("created_at", from);
    postsQuery = postsQuery.gte("created_at", from);
    reportsQuery = reportsQuery.gte("created_at", from);
  }
  if (filters.profileId) {
    mediaQuery = mediaQuery.eq("profile_id", filters.profileId);
    postsQuery = postsQuery.eq("profile_id", filters.profileId);
    reportsQuery = reportsQuery.eq("profile_id", filters.profileId);
  }
  if (filters.platform !== "all") {
    postsQuery = postsQuery.eq("platform", filters.platform);
    reportsQuery = reportsQuery.eq("platform", filters.platform);
  }

  let upcomingQuery = supabase
    .from("scheduled_posts")
    .select("id,title,platform,status,scheduled_at")
    .eq("clerk_user_id", userId)
    .eq("status", "scheduled")
    .gte("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(5);
  if (filters.profileId) upcomingQuery = upcomingQuery.eq("profile_id", filters.profileId);
  if (filters.platform !== "all") upcomingQuery = upcomingQuery.eq("platform", filters.platform);

  let recentMediaQuery = supabase
    .from("media_assets")
    .select("id,name,type,size,created_at")
    .eq("clerk_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(5);
  if (filters.profileId) recentMediaQuery = recentMediaQuery.eq("profile_id", filters.profileId);

  let recentReportsQuery = supabase
    .from("marketing_advisor_reports")
    .select("id,platform,analysis,created_at")
    .eq("clerk_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(5);
  if (filters.profileId) recentReportsQuery = recentReportsQuery.eq("profile_id", filters.profileId);
  if (filters.platform !== "all") recentReportsQuery = recentReportsQuery.eq("platform", filters.platform);

  const [mediaResult, postsResult, reportsResult, upcomingResult, recentMediaResult, recentReportsResult, profilesResult, media30Result] = await Promise.all([
    mediaQuery.limit(10000),
    postsQuery.limit(10000),
    reportsQuery.limit(10000),
    upcomingQuery,
    recentMediaQuery,
    recentReportsQuery,
    supabase.from("user_profiles").select("id,profile_name").eq("clerk_user_id", userId).order("profile_name"),
    supabase.from("media_assets").select("id,profile_id,created_at").eq("clerk_user_id", userId).gte("created_at", mediaSince30.toISOString()).limit(10000),
  ]);

  const failed = [mediaResult, postsResult, reportsResult, upcomingResult, recentMediaResult, recentReportsResult, profilesResult, media30Result].find((result) => result.error);
  if (failed?.error) {
    console.error("Analytics query failed:", failed.error.message);
    return { ok: false, status: 500, error: "Analitik verileri şu anda yüklenemedi." };
  }

  const mediaRows = (mediaResult.data ?? []) as Row[];
  const postRows = (postsResult.data ?? []) as Row[];
  const reportRows = (reportsResult.data ?? []) as Row[];
  const profileRows = (profilesResult.data ?? []) as Row[];
  const media30Rows = ((media30Result.data ?? []) as Row[]).filter((row) => !filters.profileId || row.profile_id === filters.profileId);
  const statusCounts = countBy(postRows, "status", statuses);
  const platformCounts = countBy([...postRows, ...reportRows], "platform", platforms);
  const reportScores = reportRows.map(analysisScore).filter((score): score is number => score !== null);
  const profileCounts = new Map<string, number>();
  [...mediaRows, ...postRows, ...reportRows].forEach((row) => {
    if (typeof row.profile_id === "string") profileCounts.set(row.profile_id, (profileCounts.get(row.profile_id) ?? 0) + 1);
  });
  const mostActiveEntry = Array.from(profileCounts).sort((a, b) => b[1] - a[1])[0];
  const profileName = new Map(profileRows.map((row) => [String(row.id), String(row.profile_name ?? "Profil")]));
  const mostUsedEntry = Object.entries(platformCounts).sort((a, b) => b[1] - a[1])[0] as [CalendarPlatform, number] | undefined;
  const now = Date.now();
  const daysAgo = (days: number) => now - days * 24 * 60 * 60 * 1000;

  return {
    ok: true,
    data: {
      generatedAt: new Date().toISOString(),
      filters,
      metrics: {
        totalMedia: mediaRows.length,
        totalImages: mediaRows.filter((row) => row.type === "image" || row.type === "logo").length,
        totalVideos: mediaRows.filter((row) => row.type === "video").length,
        totalScheduledPosts: postRows.length,
        postStatuses: statusCounts,
        averageAdvisorScore: reportScores.length ? Math.round(reportScores.reduce((sum, score) => sum + score, 0) / reportScores.length) : null,
        advisorReports: reportRows.length,
        mostUsedPlatform: mostUsedEntry && mostUsedEntry[1] > 0 ? mostUsedEntry[0] : null,
        mostActiveProfile: mostActiveEntry ? { id: mostActiveEntry[0], name: profileName.get(mostActiveEntry[0]) ?? "Silinmiş profil", count: mostActiveEntry[1] } : null,
        mediaLast7Days: media30Rows.filter((row) => Date.parse(String(row.created_at)) >= daysAgo(7)).length,
        mediaLast30Days: media30Rows.length,
      },
      charts: {
        mediaTrend: dailyTrend(media30Rows, "created_at"),
        postStatusDistribution: statuses.map((status) => ({ label: status, value: statusCounts[status] })),
        platformDistribution: platforms.map((platform) => ({ label: platform, value: platformCounts[platform] })),
        advisorScoreTrend: dailyTrend(reportRows, "created_at", analysisScore),
      },
      upcomingPosts: ((upcomingResult.data ?? []) as Row[]).flatMap((row) => {
        const scheduledAt = validDate(row.scheduled_at);
        const platform = row.platform as CalendarPlatform;
        const status = row.status as CalendarStatus;
        return scheduledAt && platforms.includes(platform) && statuses.includes(status)
          ? [{ id: String(row.id), title: String(row.title ?? "Paylaşım"), platform, scheduledAt, status }]
          : [];
      }),
      recentMedia: ((recentMediaResult.data ?? []) as Row[]).map((row) => ({
        id: String(row.id), name: String(row.name ?? "Medya"), type: row.type === "video" || row.type === "logo" ? row.type : "image", size: Number(row.size ?? 0), createdAt: String(row.created_at ?? ""),
      })),
      recentRecommendations: ((recentReportsResult.data ?? []) as Row[]).flatMap((row) => {
        const score = analysisScore(row);
        const platform = row.platform as AdvisorPlatform;
        return score !== null && platforms.includes(platform) ? [{ id: String(row.id), platform, score, recommendation: recommendation(row), createdAt: String(row.created_at ?? "") }] : [];
      }),
      profiles: profileRows.map((row) => ({ id: String(row.id), name: String(row.profile_name ?? "Profil") })),
      externalAnalyticsConnected: false,
    },
  };
}
