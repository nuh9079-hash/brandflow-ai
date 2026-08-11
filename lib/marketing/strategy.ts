import { GoogleGenAI } from "@google/genai";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { socialPlatforms, type SocialPlatform } from "@/lib/social/connections";

export type StrategyInput = { businessName: string; industry: string; targetAudience: string; goals: string; platforms: SocialPlatform[]; website: string };
export type WeeklyPlanItem = { day: string; topic: string; format: string; platform: string; cta: string };
export type MarketingStrategy = {
  executiveSummary: string; growthOpportunities: string[]; weaknesses: string[]; contentStrategy: string[];
  seoSuggestions: string[]; advertisingIdeas: string[]; brandPositioning: string; weeklyContentPlan: WeeklyPlanItem[];
  ctaRecommendations: string[]; marketingScore: number;
};
export type StrategyReport = StrategyInput & { id: string; report: MarketingStrategy; createdAt: string };
type Result<T> = { ok: true; data: T } | { ok: false; status: number; error: string };
type Row = Record<string, unknown>;
const tableName = "marketing_advisor_strategy_reports";

function text(value: unknown, max: number) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }
function strings(value: unknown, max = 8) { return Array.isArray(value) ? value.map((item) => text(item, 800)).filter(Boolean).slice(0, max) : []; }
function platforms(value: unknown) { return Array.isArray(value) ? [...new Set(value.filter((item): item is SocialPlatform => socialPlatforms.includes(item as SocialPlatform)))] : []; }
function score(value: unknown) { const number = Number(value); return Number.isFinite(number) ? Math.min(100, Math.max(0, Math.round(number))) : 0; }

export function sanitizeStrategyInput(value: unknown): StrategyInput | null {
  const raw = value && typeof value === "object" ? value as Row : {}; const selected = platforms(raw.platforms);
  const input = { businessName: text(raw.businessName, 160), industry: text(raw.industry, 160), targetAudience: text(raw.targetAudience, 1200), goals: text(raw.goals, 1600), platforms: selected, website: text(raw.website, 500) };
  return input.businessName && input.industry && input.targetAudience && input.goals && selected.length ? input : null;
}

function normalizeStrategy(value: unknown): MarketingStrategy {
  const raw = value && typeof value === "object" ? value as Row : {};
  const weekly = Array.isArray(raw.weeklyContentPlan) ? raw.weeklyContentPlan.slice(0, 7).map((item) => { const row = item && typeof item === "object" ? item as Row : {}; return { day: text(row.day, 40), topic: text(row.topic, 400), format: text(row.format, 100), platform: text(row.platform, 100), cta: text(row.cta, 300) }; }).filter((item) => item.day && item.topic) : [];
  return { executiveSummary: text(raw.executiveSummary, 2400), growthOpportunities: strings(raw.growthOpportunities), weaknesses: strings(raw.weaknesses), contentStrategy: strings(raw.contentStrategy, 12), seoSuggestions: strings(raw.seoSuggestions, 12), advertisingIdeas: strings(raw.advertisingIdeas, 10), brandPositioning: text(raw.brandPositioning, 1600), weeklyContentPlan: weekly, ctaRecommendations: strings(raw.ctaRecommendations, 10), marketingScore: score(raw.marketingScore) };
}

function normalizeReport(row: Row): StrategyReport {
  return { id: String(row.id), businessName: String(row.business_name || ""), industry: String(row.industry || ""), targetAudience: String(row.target_audience || ""), goals: String(row.goals || ""), platforms: platforms(row.platforms), website: String(row.website || ""), report: normalizeStrategy(row.report), createdAt: String(row.created_at || "") };
}

async function internalContext(userId: string) {
  const supabase = getSupabaseServerClient(); if (!supabase) throw new Error("DATABASE_MISSING");
  const [media, calendar, connections] = await Promise.all([
    supabase.from("media_assets").select("id,type", { count: "exact", head: false }).eq("clerk_user_id", userId).limit(10000),
    supabase.from("content_calendar").select("id,status,platforms").eq("clerk_user_id", userId).limit(10000),
    supabase.from("social_connections").select("id,platform,status").eq("clerk_user_id", userId).limit(1000),
  ]);
  if (media.error || calendar.error || connections.error) throw new Error("INTERNAL_DATA_ERROR");
  return { mediaAssets: media.data?.length || 0, images: media.data?.filter((item) => item.type === "image" || item.type === "logo").length || 0, videos: media.data?.filter((item) => item.type === "video").length || 0, scheduledPosts: calendar.data?.filter((item) => item.status === "scheduled").length || 0, publishedPosts: calendar.data?.filter((item) => item.status === "published").length || 0, connectedPlatforms: connections.data?.filter((item) => item.status === "connected").map((item) => item.platform) || [] };
}

function vertexConfig() {
  const project = process.env.GOOGLE_CLOUD_PROJECT?.trim(); const location = process.env.GOOGLE_CLOUD_LOCATION?.trim();
  if (!project) throw new Error("CONFIG_PROJECT"); if (!location) throw new Error("CONFIG_LOCATION"); return { project, location };
}

async function generate(input: StrategyInput, context: Awaited<ReturnType<typeof internalContext>>) {
  const { project, location } = vertexConfig(); const ai = new GoogleGenAI({ vertexai: true, project, location });
  const prompt = `You are BrandFlow AI's senior marketing strategist. Create a practical Turkish strategy using ONLY the user brief and BrandFlow internal counts below. Never claim or infer external reach, impressions, followers, engagement, competitor performance, website traffic, or social analytics. Clearly frame recommendations as strategic suggestions, not observed facts.

User brief: ${JSON.stringify(input)}
BrandFlow internal counts: ${JSON.stringify(context)}

Return only valid JSON: {"executiveSummary":"","growthOpportunities":[""],"weaknesses":[""],"contentStrategy":[""],"seoSuggestions":[""],"advertisingIdeas":[""],"brandPositioning":"","weeklyContentPlan":[{"day":"Pazartesi","topic":"","format":"","platform":"","cta":""}],"ctaRecommendations":[""],"marketingScore":0}. The weekly plan must contain exactly 7 days. Score 0-100 must reflect brief completeness and strategic readiness only, never external performance.`;
  try {
    const stream = await ai.models.generateContentStream({ model: process.env.GEMINI_ADVISOR_MODEL || "gemini-2.5-flash", contents: prompt, config: { responseMimeType: "application/json" } });
    let output = ""; for await (const chunk of stream) output += chunk.text || "";
    return normalizeStrategy(JSON.parse(output));
  } catch (error) { console.error("Marketing Strategy Gemini Error:", error); throw new Error("PROVIDER_ERROR"); }
}

export async function createStrategyReport(userId: string, input: StrategyInput): Promise<Result<StrategyReport>> {
  try {
    const report = await generate(input, await internalContext(userId)); const supabase = getSupabaseServerClient(); if (!supabase) return { ok: false, status: 503, error: "Advisor veritabanı yapılandırılmadı." };
    const { data, error } = await supabase.from(tableName).insert({ clerk_user_id: userId, business_name: input.businessName, industry: input.industry, target_audience: input.targetAudience, goals: input.goals, platforms: input.platforms, website: input.website, report, marketing_score: report.marketingScore }).select("*").single();
    if (error) {
      console.error("Marketing Advisor report insert failed:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        table: tableName,
        hasAuthenticatedUser: Boolean(userId),
      });
      return { ok: false, status: 500, error: "Advisor raporu kaydedilemedi." };
    }
    return { ok: true, data: normalizeReport(data as Row) };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "CONFIG_PROJECT") return { ok: false, status: 503, error: "GOOGLE_CLOUD_PROJECT yapılandırılmadı." };
    if (message === "CONFIG_LOCATION") return { ok: false, status: 503, error: "GOOGLE_CLOUD_LOCATION yapılandırılmadı." };
    if (message === "DATABASE_MISSING" || message === "INTERNAL_DATA_ERROR") return { ok: false, status: 503, error: "BrandFlow iç verileri okunamadı." };
    return { ok: false, status: 502, error: "Gemini pazarlama analizi şu anda kullanılamıyor." };
  }
}

export async function listStrategyReports(userId: string, limit = 30): Promise<Result<StrategyReport[]>> {
  const supabase = getSupabaseServerClient(); if (!supabase) return { ok: false, status: 503, error: "Advisor veritabanı yapılandırılmadı." };
  const { data, error } = await supabase.from(tableName).select("id,business_name,industry,target_audience,goals,platforms,website,report,created_at").eq("clerk_user_id", userId).order("created_at", { ascending: false }).limit(Math.min(Math.max(limit, 1), 100));
  return error ? { ok: false, status: 500, error: "Rapor geçmişi yüklenemedi." } : { ok: true, data: (data || []).map((row) => normalizeReport(row as Row)) };
}

export async function deleteStrategyReport(userId: string, id: string): Promise<Result<{ deleted: true }>> {
  const supabase = getSupabaseServerClient(); if (!supabase) return { ok: false, status: 503, error: "Advisor veritabanı yapılandırılmadı." };
  const { data, error } = await supabase.from(tableName).delete().eq("clerk_user_id", userId).eq("id", id).select("id").maybeSingle();
  if (error) return { ok: false, status: 500, error: "Rapor silinemedi." }; if (!data) return { ok: false, status: 404, error: "Rapor bulunamadı." }; return { ok: true, data: { deleted: true } };
}
