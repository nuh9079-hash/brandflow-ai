import { GoogleGenAI } from "@google/genai";
import { getMedia } from "@/lib/media/server";
import { createSignedMediaUrl } from "@/lib/media/storage";
import type { MediaAsset } from "@/lib/media/types";
import { getDefaultUserProfile, getUserProfile } from "@/lib/profiles/server";
import type { UserProfile } from "@/lib/profiles/types";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type AdvisorPlatform = "instagram" | "facebook" | "tiktok" | "twitter" | "linkedin";

export type AdvisorCategory =
  | "visualQuality" |"brandConsistency" |"audienceMatch" |"engagementPrediction" |"ctaStrength" |"captionQuality" |"hashtagQuality" |"platformOptimization" |"accessibility" |"readingDifficulty" |"colorHarmony" |"composition" |"textReadability";

export type AdvisorCategoryResult = {
  score: number;
  explanation: string;
  suggestions: string[];
};

export type MarketingAdvisorAnalysis = {
  overallScore: number;
  categories: Record<AdvisorCategory, AdvisorCategoryResult>;
  betterCaption: string;
  betterCta: string;
  betterHashtags: string[];
  betterPostingTime: string;
  betterAspectRatioRecommendation: string;
  suggestedAudience: string;
  suggestedCampaignObjective: string;
};

export type MarketingAdvisorReport = {
  id: string;
  clerkUserId: string;
  profileId?: string | null;
  mediaAssetId: string;
  platform: AdvisorPlatform;
  caption: string;
  analysis: MarketingAdvisorAnalysis;
  createdAt: string;
  media?: MediaAsset | null;
  profile?: UserProfile | null;
};

type AdvisorInput = {
  mediaAssetId: string;
  caption: string;
  platform: AdvisorPlatform;
  profileId?: string | null;
};

type AdvisorMediaPayload = {
  media: MediaAsset;
  base64: string;
  mimeType: string;
};

type AdvisorServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string };

const tableName = "marketing_advisor_reports";
const modelName = process.env.GEMINI_MARKETING_ADVISOR_MODEL || "gemini-2.5-flash";
const maxMediaBytes = 20 * 1024 * 1024;

const categories: AdvisorCategory[] = [
  "visualQuality",
  "brandConsistency",
  "audienceMatch",
  "engagementPrediction",
  "ctaStrength",
  "captionQuality",
  "hashtagQuality",
  "platformOptimization",
  "accessibility",
  "readingDifficulty",
  "colorHarmony",
  "composition",
  "textReadability",
];

export const advisorPlatforms: AdvisorPlatform[] = ["instagram", "facebook", "tiktok", "twitter", "linkedin"];

function serviceError<T>(status = 500, error = "Analiz tamamlanamadı."): AdvisorServiceResult<T> {
  return { ok: false, status, error };
}

function safeText(value: unknown, maxLength = 4000) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function isPlatform(value: unknown): value is AdvisorPlatform {
  return typeof value === "string" && advisorPlatforms.includes(value as AdvisorPlatform);
}

export function sanitizeAdvisorInput(body: unknown): AdvisorInput | null {
  const input = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const mediaAssetId = safeText(input.mediaAssetId, 120);
  const caption = safeText(input.caption, 4000);
  const profileId = safeText(input.profileId, 120);

  if (!mediaAssetId || !isPlatform(input.platform)) return null;

  return {
    mediaAssetId,
    caption,
    platform: input.platform,
    profileId: profileId || null,
  };
}

function getVertexConfig() {
  const project = safeText(process.env.GOOGLE_CLOUD_PROJECT, 140);
  const location = safeText(process.env.GOOGLE_CLOUD_LOCATION, 80);

  if (!project) throw new Error("CONFIG_MISSING:GOOGLE_CLOUD_PROJECT");
  if (!location) throw new Error("CONFIG_MISSING:GOOGLE_CLOUD_LOCATION");

  return { project, location };
}

function sanitizeProviderError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  return (
    message
      .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [GOOGLE_ACCESS_TOKEN]")
      .replace(/ya29\.[A-Za-z0-9._-]+/g, "[GOOGLE_ACCESS_TOKEN]")
      .replace(/authorization[:=]\s*([^\s,}]+)/gi, "authorization=[REDACTED]")
      .slice(0, 700) || "Sağlayıcı ayrıntı vermedi."
  );
}

function normalizeScore(value: unknown) {
  const score = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(score)) return 0;
  return Math.min(100, Math.max(0, Math.round(score)));
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => safeText(item, 260)).filter(Boolean).slice(0, 8);
}

function fallbackCategory(value: unknown): AdvisorCategoryResult {
  const input = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    score: normalizeScore(input.score),
    explanation: safeText(input.explanation, 800) || "Bu başlık için açıklama üretilemedi.",
    suggestions: normalizeStringArray(input.suggestions),
  };
}

function normalizeAnalysis(value: unknown): MarketingAdvisorAnalysis {
  const input = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const rawCategories = input.categories && typeof input.categories === "object" ? (input.categories as Record<string, unknown>) : {};

  return {
    overallScore: normalizeScore(input.overallScore),
    categories: Object.fromEntries(categories.map((category) => [category, fallbackCategory(rawCategories[category])])) as Record<
      AdvisorCategory,
      AdvisorCategoryResult
    >,
    betterCaption: safeText(input.betterCaption, 1200),
    betterCta: safeText(input.betterCta, 400),
    betterHashtags: normalizeStringArray(input.betterHashtags).slice(0, 20),
    betterPostingTime: safeText(input.betterPostingTime, 300),
    betterAspectRatioRecommendation: safeText(input.betterAspectRatioRecommendation, 300),
    suggestedAudience: safeText(input.suggestedAudience, 500),
    suggestedCampaignObjective: safeText(input.suggestedCampaignObjective, 500),
  };
}

function extractJson(text: string) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced || trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("AI yapılandırılmış analiz döndürmedi.");
  return JSON.parse(candidate.slice(start, end + 1)) as unknown;
}

function profileSummary(profile: UserProfile | null) {
  if (!profile) return "No brand profile selected.";

  return [
    `Profile name: ${profile.profile_name}`,
    `Type: ${profile.profile_type}`,
    `Business/name: ${profile.business_name || profile.display_name || profile.creator_name || ""}`,
    `Product/service/topic: ${profile.product_or_service || profile.main_topic || ""}`,
    `Description: ${profile.description || ""}`,
    `Tone: ${profile.brand_tone || profile.creator_tone || profile.content_style || ""}`,
    `Target audience: ${profile.target_audience || profile.creator_audience || ""}`,
    `Brand colors: ${profile.brand_colors || ""}`,
    `Goal: ${profile.content_goal || ""}`,
    `Website: ${profile.website || ""}`,
    `Required words: ${profile.required_words.join(", ")}`,
    `Blocked words/topics: ${[...profile.blocked_words, ...profile.blocked_topics].join(", ")}`,
  ].join("\n");
}

async function loadProfile(userId: string, profileId?: string | null) {
  if (profileId) {
    const { profile } = await getUserProfile(userId, profileId);
    return profile;
  }

  const { profile } = await getDefaultUserProfile(userId);
  return profile;
}

async function loadMediaForAnalysis(userId: string, mediaAssetId: string) {
  const media = await getMedia(userId, mediaAssetId);
  if (!media.ok) return media;

  if (media.data.type !== "image" && media.data.type !== "video") {
    return serviceError<never>(400, "Analiz için görsel veya video seçmelisin.");
  }

  if (!media.data.storagePath) {
    return serviceError<never>(404, "Seçilen medyanın dosya bağlantısı hazır değil.");
  }

  if (media.data.size > maxMediaBytes) {
    return serviceError<never>(400, "Analiz için medya dosyası en fazla 20 MB olabilir.");
  }

  const signed = await createSignedMediaUrl(userId, media.data.storagePath);
  if (!signed.ok) return serviceError<never>(signed.status, "Seçilen medya için güvenli bağlantı oluşturulamadı.");

  const response = await fetch(signed.data.signedUrl);
  if (!response.ok) return serviceError<never>(502, "Seçilen medya okunamadı. Analiz yapılamaz.");

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.byteLength <= 0) return serviceError<never>(502, "Seçilen medya boş görünüyor. Analiz yapılamaz.");
  if (buffer.byteLength > maxMediaBytes) return serviceError<never>(400, "Analiz için medya dosyası en fazla 20 MB olabilir.");

  return {
    ok: true as const,
    data: {
      media: media.data,
      base64: buffer.toString("base64"),
      mimeType: media.data.mimeType || response.headers.get("content-type") || "application/octet-stream",
    },
  };
}

function buildPrompt(input: AdvisorInput, media: MediaAsset, profile: UserProfile | null) {
  return `You are BrandFlow AI's senior marketing advisor. Analyze the attached ${media.type} for the target platform.

Target platform: ${input.platform}
Caption: ${input.caption || "No caption provided."}
Media name: ${media.name}
Media mime type: ${media.mimeType}

Brand profile:
${profileSummary(profile)}

Return only valid JSON with this exact shape:
{
  "overallScore": 0,
  "categories": {
    "visualQuality": { "score": 0, "explanation": "", "suggestions": [""] },
    "brandConsistency": { "score": 0, "explanation": "", "suggestions": [""] },
    "audienceMatch": { "score": 0, "explanation": "", "suggestions": [""] },
    "engagementPrediction": { "score": 0, "explanation": "", "suggestions": [""] },
    "ctaStrength": { "score": 0, "explanation": "", "suggestions": [""] },
    "captionQuality": { "score": 0, "explanation": "", "suggestions": [""] },
    "hashtagQuality": { "score": 0, "explanation": "", "suggestions": [""] },
    "platformOptimization": { "score": 0, "explanation": "", "suggestions": [""] },
    "accessibility": { "score": 0, "explanation": "", "suggestions": [""] },
    "readingDifficulty": { "score": 0, "explanation": "", "suggestions": [""] },
    "colorHarmony": { "score": 0, "explanation": "", "suggestions": [""] },
    "composition": { "score": 0, "explanation": "", "suggestions": [""] },
    "textReadability": { "score": 0, "explanation": "", "suggestions": [""] }
  },
  "betterCaption": "",
  "betterCta": "",
  "betterHashtags": ["#example"],
  "betterPostingTime": "",
  "betterAspectRatioRecommendation": "",
  "suggestedAudience": "",
  "suggestedCampaignObjective": ""
}

Use practical Turkish explanations. Do not invent visual details if the media is not understandable.`;
}

async function runGeminiAnalysis(input: AdvisorInput, mediaPayload: AdvisorMediaPayload, profile: UserProfile | null) {
  const { project, location } = getVertexConfig();
  const ai = new GoogleGenAI({ vertexai: true, project, location });

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [
        {
          role: "user",
          parts: [
            { text: buildPrompt(input, mediaPayload.media, profile) },
            {
              inlineData: {
                mimeType: mediaPayload.mimeType,
                data: mediaPayload.base64,
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
      },
    });
    const text = response.text || response.candidates?.flatMap((candidate) => candidate.content?.parts ?? []).map((part) => part.text || "").join("\n") || "";

    return normalizeAnalysis(extractJson(text));
  } catch (error) {
    console.error("Marketing Advisor Gemini Error:", error);
    if (error instanceof Error && error.stack) {
      console.error("Marketing Advisor Gemini Error Stack:", error.stack);
    }
    throw new Error(`PROVIDER_ERROR:${sanitizeProviderError(error)}`);
  }
}

function normalizeReport(row: Record<string, unknown>): MarketingAdvisorReport {
  return {
    id: String(row.id),
    clerkUserId: String(row.clerk_user_id),
    profileId: typeof row.profile_id === "string" ? row.profile_id : null,
    mediaAssetId: String(row.media_asset_id),
    platform: isPlatform(row.platform) ? row.platform : "instagram",
    caption: String(row.caption ?? ""),
    analysis: normalizeAnalysis(row.analysis),
    createdAt: String(row.created_at ?? ""),
    media: null,
    profile: null,
  };
}

export async function listAdvisorReports(userId: string, limit = 5): Promise<AdvisorServiceResult<MarketingAdvisorReport[]>> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return serviceError(503, "Marketing Advisor veritabanı yapılandırılmadı.");

  const { data, error } = await supabase
    .from(tableName)
    .select("*")
    .eq("clerk_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 20));

  if (error) return serviceError();

  return { ok: true, data: (data ?? []).map((row) => normalizeReport(row as Record<string, unknown>)) };
}

async function saveAdvisorReport(userId: string, input: AdvisorInput, analysis: MarketingAdvisorAnalysis) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return serviceError<MarketingAdvisorReport>(503, "Marketing Advisor veritabanı yapılandırılmadı.");

  const { data, error } = await supabase
    .from(tableName)
    .insert({
      clerk_user_id: userId,
      profile_id: input.profileId || null,
      media_asset_id: input.mediaAssetId,
      platform: input.platform,
      caption: input.caption,
      analysis,
    })
    .select("*")
    .single();

  if (error) return serviceError<MarketingAdvisorReport>();

  return { ok: true as const, data: normalizeReport(data as Record<string, unknown>) };
}

export async function analyzeMarketingAsset(userId: string, input: AdvisorInput): Promise<AdvisorServiceResult<MarketingAdvisorReport>> {
  const media = await loadMediaForAnalysis(userId, input.mediaAssetId);
  if (!media.ok) return media;

  const profile = await loadProfile(userId, input.profileId);

  try {
    const analysis = await runGeminiAnalysis(input, media.data, profile);
    const saved = await saveAdvisorReport(userId, input, analysis);
    if (!saved.ok) return saved;

    return {
      ok: true,
      data: {
        ...saved.data,
        media: media.data.media,
        profile,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message === "CONFIG_MISSING:GOOGLE_CLOUD_PROJECT") {
      return serviceError(503, "Gemini analizi için GOOGLE_CLOUD_PROJECT yapılandırılmamış.");
    }

    if (message === "CONFIG_MISSING:GOOGLE_CLOUD_LOCATION") {
      return serviceError(503, "Gemini analizi için GOOGLE_CLOUD_LOCATION yapılandırılmamış.");
    }

    if (message.startsWith("PROVIDER_ERROR:")) {
      return serviceError(502, `AI analizi kullanılamadı. Sağlayıcı mesajı: ${message.replace("PROVIDER_ERROR:", "")}`);
    }

    return serviceError(500, "AI analizi tamamlanamadı.");
  }
}
