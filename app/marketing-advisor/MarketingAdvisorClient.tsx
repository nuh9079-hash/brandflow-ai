"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button, Card, EmptyState } from "@/components/ui";
import type { AdvisorCategory, AdvisorPlatform, MarketingAdvisorAnalysis, MarketingAdvisorReport } from "@/lib/marketing/advisor";
import type { MediaAsset } from "@/lib/media/types";
import type { UserProfile } from "@/lib/profiles/types";

type MediaResponse = {
  data?: MediaAsset[];
  error?: string;
};

type ProfilesResponse = {
  profiles?: UserProfile[];
  error?: string;
};

type AdvisorResponse = {
  data?: MarketingAdvisorReport | MarketingAdvisorReport[];
  error?: string;
};

const platforms: Array<{ value: AdvisorPlatform; label: string; helper: string }> = [
  { value: "instagram", label: "Instagram", helper: "Reels, post ve story dili" },
  { value: "facebook", label: "Facebook", helper: "Topluluk ve reklam uyumu" },
  { value: "tiktok", label: "TikTok", helper: "Hook ve hızlı izlenme potansiyeli" },
  { value: "twitter", label: "X", helper: "Kısa metin ve tartışma etkisi" },
  { value: "linkedin", label: "LinkedIn", helper: "Profesyonel güven ve netlik" },
];

const categoryLabels: Record<AdvisorCategory, string> = {
  visualQuality: "Visual Quality",
  brandConsistency: "Brand Consistency",
  audienceMatch: "Audience Match",
  engagementPrediction: "Engagement Prediction",
  ctaStrength: "CTA Strength",
  captionQuality: "Caption Quality",
  hashtagQuality: "Hashtag Quality",
  platformOptimization: "Platform Optimization",
  accessibility: "Accessibility",
  readingDifficulty: "Reading Difficulty",
  colorHarmony: "Color Harmony",
  composition: "Composition",
  textReadability: "Text Readability",
};

const categoryOrder = Object.keys(categoryLabels) as AdvisorCategory[];

function scoreColor(score: number) {
  if (score >= 80) return "text-emerald-200";
  if (score >= 60) return "text-amber-200";
  return "text-red-200";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function isReportArray(value: AdvisorResponse["data"]): value is MarketingAdvisorReport[] {
  return Array.isArray(value);
}

export function MarketingAdvisorClient() {
  const [mediaItems, setMediaItems] = useState<MediaAsset[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [latestReports, setLatestReports] = useState<MarketingAdvisorReport[]>([]);
  const [mediaAssetId, setMediaAssetId] = useState("");
  const [profileId, setProfileId] = useState("");
  const [platform, setPlatform] = useState<AdvisorPlatform>("instagram");
  const [caption, setCaption] = useState("");
  const [result, setResult] = useState<MarketingAdvisorReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [mediaResponse, profilesResponse, latestResponse] = await Promise.all([
        fetch("/api/media?sort=newest"),
        fetch("/api/profiles"),
        fetch("/api/marketing-advisor/analyze?limit=5"),
      ]);
      const mediaJson = (await mediaResponse.json()) as MediaResponse;
      const profilesJson = (await profilesResponse.json()) as ProfilesResponse;
      const latestJson = (await latestResponse.json()) as AdvisorResponse;

      if (mediaResponse.ok && mediaJson.data) {
        setMediaItems(mediaJson.data.filter((item) => (item.type === "image" || item.type === "video") && item.storagePath));
      }

      if (profilesResponse.ok && profilesJson.profiles) {
        const loadedProfiles = profilesJson.profiles;
        setProfiles(loadedProfiles);
        setProfileId((current) => current || loadedProfiles.find((profile) => profile.is_default)?.id || loadedProfiles[0]?.id || "");
      }

      if (latestResponse.ok && isReportArray(latestJson.data)) {
        setLatestReports(latestJson.data);
      }
    } catch {
      setError("Marketing Advisor bilgileri yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const selectedMedia = useMemo(() => mediaItems.find((item) => item.id === mediaAssetId) || null, [mediaItems, mediaAssetId]);
  const selectedProfile = useMemo(() => profiles.find((profile) => profile.id === profileId) || null, [profiles, profileId]);
  const analysis: MarketingAdvisorAnalysis | null = result?.analysis || null;

  async function analyze() {
    if (!mediaAssetId) {
      setError("Analiz için Medya Merkezinden bir görsel veya video seç.");
      return;
    }

    setAnalyzing(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/marketing-advisor/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaAssetId,
          profileId: profileId || null,
          platform,
          caption,
        }),
      });
      const json = (await response.json()) as AdvisorResponse;

      if (!response.ok || !json.data || isReportArray(json.data)) {
        throw new Error(json.error || "Analiz oluşturulamadı.");
      }

      setResult(json.data);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analiz oluşturulamadı.");
    } finally {
      setAnalyzing(false);
    }
  }

  function applyLatest(report: MarketingAdvisorReport) {
    setResult(report);
    setMediaAssetId(report.mediaAssetId);
    setProfileId(report.profileId || "");
    setPlatform(report.platform);
    setCaption(report.caption);
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(340px,460px)_1fr]">
      <Card className="p-5">
        <form
          className="grid gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            void analyze();
          }}
        >
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Analiz briefi</p>
            <h2 className="mt-2 text-xl font-black text-white">İçeriği değerlendir</h2>
          </div>

          <label className="block text-sm font-semibold text-zinc-200">
            Medya
            <select value={mediaAssetId} onChange={(event) => setMediaAssetId(event.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-sm font-semibold text-zinc-100 outline-none focus:border-emerald-300">
              <option value="">Medya seç</option>
              {mediaItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.type === "video" ? "Video" : "Görsel"} - {item.name}
                </option>
              ))}
            </select>
          </label>

          {selectedMedia && (
            <div className="rounded-lg border border-white/10 bg-zinc-950/70 p-3 text-sm text-zinc-300">
              <span className="font-black text-white">{selectedMedia.name}</span>
              <span className="ml-2 text-zinc-500">{selectedMedia.mimeType}</span>
            </div>
          )}

          <label className="block text-sm font-semibold text-zinc-200">
            Marka profili
            <select value={profileId} onChange={(event) => setProfileId(event.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-sm font-semibold text-zinc-100 outline-none focus:border-emerald-300">
              <option value="">Profil kullanma</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.profile_name}
                </option>
              ))}
            </select>
          </label>

          {selectedProfile && (
            <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm leading-6 text-emerald-100">
              {selectedProfile.business_name || selectedProfile.display_name || selectedProfile.creator_name || selectedProfile.profile_name}
              {selectedProfile.target_audience && <span className="block text-emerald-200/80">Hedef: {selectedProfile.target_audience}</span>}
            </div>
          )}

          <div>
            <p className="text-sm font-semibold text-zinc-200">Platform</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {platforms.map((item) => (
                <button key={item.value} type="button" onClick={() => setPlatform(item.value)} className={`rounded-lg border p-3 text-left transition ${platform === item.value ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-100" : "border-white/10 bg-white/[0.03] text-zinc-400 hover:text-white"}`}>
                  <span className="block text-sm font-black">{item.label}</span>
                  <span className="mt-1 block text-xs">{item.helper}</span>
                </button>
              ))}
            </div>
          </div>

          <label className="block text-sm font-semibold text-zinc-200">
            Caption
            <textarea value={caption} onChange={(event) => setCaption(event.target.value)} rows={6} placeholder="Mevcut paylaşım metnini buraya yaz..." className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-zinc-600 focus:border-emerald-300" />
          </label>

          {error && <div className="rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm font-semibold text-red-200">{error}</div>}

          <Button type="submit" disabled={loading || analyzing} className="py-4 text-base font-black">
            {analyzing && <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-950/30 border-t-zinc-950" />}
            {analyzing ? "Analiz ediliyor" : "Analiz Et"}
          </Button>

          <Link href="/media" className="text-center text-sm font-bold text-zinc-400 transition hover:text-white">
            Medya Merkezine git
          </Link>
        </form>
      </Card>

      <div className="grid gap-5">
        {loading ? (
          <Card className="p-5">
            <div className="h-36 animate-pulse rounded-lg bg-white/5" />
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <div className="h-24 animate-pulse rounded-lg bg-white/5" />
              <div className="h-24 animate-pulse rounded-lg bg-white/5" />
              <div className="h-24 animate-pulse rounded-lg bg-white/5" />
            </div>
          </Card>
        ) : !analysis ? (
          <EmptyState title="Henüz analiz yok" description="Medya seç, caption ekle ve hedef platformu belirle. Advisor gerçek medya dosyasına erişmeden analiz üretmez." />
        ) : (
          <>
            <Card className="p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Overall score</p>
                  <h2 className={`mt-2 text-6xl font-black ${scoreColor(analysis.overallScore)}`}>{analysis.overallScore}</h2>
                </div>
                <div className="grid gap-2 text-sm text-zinc-300">
                  <p><span className="text-zinc-500">Platform:</span> {platforms.find((item) => item.value === result?.platform)?.label}</p>
                  <p><span className="text-zinc-500">Medya:</span> {selectedMedia?.name || result?.mediaAssetId}</p>
                  <p><span className="text-zinc-500">Tarih:</span> {result ? formatDate(result.createdAt) : ""}</p>
                </div>
              </div>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {categoryOrder.map((category) => {
                const item = analysis.categories[category];
                return (
                  <Card key={category} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-sm font-black text-white">{categoryLabels[category]}</h3>
                      <span className={`text-lg font-black ${scoreColor(item.score)}`}>{item.score}</span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-zinc-400">{item.explanation}</p>
                    {item.suggestions.length > 0 && (
                      <ul className="mt-3 list-disc space-y-1 pl-4 text-sm leading-6 text-zinc-300">
                        {item.suggestions.map((suggestion) => (
                          <li key={suggestion}>{suggestion}</li>
                        ))}
                      </ul>
                    )}
                  </Card>
                );
              })}
            </div>

            <Card className="p-5">
              <h2 className="text-xl font-black text-white">Daha iyi öneriler</h2>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div className="rounded-lg border border-white/10 bg-zinc-950/70 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Caption</p>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-200">{analysis.betterCaption}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-zinc-950/70 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">CTA</p>
                  <p className="mt-3 text-sm leading-6 text-zinc-200">{analysis.betterCta}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-zinc-950/70 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Hashtags</p>
                  <p className="mt-3 text-sm leading-6 text-emerald-200">{analysis.betterHashtags.join(" ")}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-zinc-950/70 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Zaman ve oran</p>
                  <p className="mt-3 text-sm leading-6 text-zinc-200">{analysis.betterPostingTime}</p>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">{analysis.betterAspectRatioRecommendation}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-zinc-950/70 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Kitle</p>
                  <p className="mt-3 text-sm leading-6 text-zinc-200">{analysis.suggestedAudience}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-zinc-950/70 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Kampanya hedefi</p>
                  <p className="mt-3 text-sm leading-6 text-zinc-200">{analysis.suggestedCampaignObjective}</p>
                </div>
              </div>
            </Card>
          </>
        )}

        <Card className="p-5">
          <h2 className="text-lg font-black text-white">Son AI önerileri</h2>
          <div className="mt-4 grid gap-3">
            {latestReports.length === 0 ? (
              <p className="text-sm text-zinc-500">Henüz kayıtlı analiz yok.</p>
            ) : (
              latestReports.map((report) => (
                <button key={report.id} type="button" onClick={() => applyLatest(report)} className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-left transition hover:bg-white/5">
                  <span>
                    <span className="block text-sm font-black text-white">{platforms.find((item) => item.value === report.platform)?.label} analizi</span>
                    <span className="mt-1 block text-xs text-zinc-500">{formatDate(report.createdAt)}</span>
                  </span>
                  <span className={`text-lg font-black ${scoreColor(report.analysis.overallScore)}`}>{report.analysis.overallScore}</span>
                </button>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
