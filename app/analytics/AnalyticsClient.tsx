"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BarChart, LineChart } from "@/components/analytics/Charts";
import { Button, Card, StatCard } from "@/components/ui";
import type { AnalyticsOverview, AnalyticsPlatform, AnalyticsRange } from "@/lib/analytics/server";

type ApiResponse = { data?: AnalyticsOverview; error?: string };
const platformLabels: Record<string, string> = { instagram: "Instagram", facebook: "Facebook", twitter: "X", tiktok: "TikTok", linkedin: "LinkedIn" };

function dateLabel(value: string) {
  return new Date(value).toLocaleString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function bytes(value: number) {
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export function AnalyticsClient() {
  const [range, setRange] = useState<AnalyticsRange>("30d");
  const [profileId, setProfileId] = useState("all");
  const [platform, setPlatform] = useState<AnalyticsPlatform>("all");
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
      const params = new URLSearchParams({ range, platform });
      if (profileId !== "all") params.set("profileId", profileId);
      const response = await fetch(`/api/analytics/overview?${params.toString()}`);
      const json = (await response.json()) as ApiResponse;
      if (!response.ok || !json.data) throw new Error(json.error || "Analitik verileri yüklenemedi.");
        if (active) {
          setData(json.data);
          setError("");
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Analitik verileri yüklenemedi.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [platform, profileId, range, retry]);

  if (loading && !data) {
    return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }, (_, index) => <div key={index} className="h-32 animate-pulse rounded-lg border border-white/10 bg-white/5" />)}</div>;
  }

  if (error && !data) {
    return <Card className="p-8 text-center"><h2 className="text-xl font-black">Veriler yüklenemedi</h2><p className="mt-2 text-sm text-zinc-400">{error}</p><Button className="mt-5" onClick={() => { setLoading(true); setRetry((value) => value + 1); }}>Tekrar dene</Button></Card>;
  }

  if (!data) return null;
  const { metrics, charts } = data;

  return (
    <div className="space-y-5">
      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <label className="text-xs font-bold text-zinc-400">Dönem<select value={range} onChange={(event) => setRange(event.target.value as AnalyticsRange)} className="mt-2 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2.5 text-sm text-white"><option value="7d">Son 7 gün</option><option value="30d">Son 30 gün</option><option value="90d">Son 90 gün</option><option value="all">Tüm zamanlar</option></select></label>
          <label className="text-xs font-bold text-zinc-400">Profil<select value={profileId} onChange={(event) => setProfileId(event.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2.5 text-sm text-white"><option value="all">Tüm profiller</option>{data.profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}</select></label>
          <label className="text-xs font-bold text-zinc-400">Platform<select value={platform} onChange={(event) => setPlatform(event.target.value as AnalyticsPlatform)} className="mt-2 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2.5 text-sm text-white"><option value="all">Tüm platformlar</option>{Object.entries(platformLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <div className="flex items-end"><p className="pb-2 text-xs leading-5 text-zinc-500">Platform filtresi yalnızca takvim ve Advisor verilerine uygulanır.</p></div>
        </div>
      </Card>

      {error && <div className="rounded-lg border border-amber-400/20 bg-amber-400/10 p-3 text-sm text-amber-100">{error}</div>}

      <section>
        <div className="mb-3"><p className="text-xs uppercase tracking-[0.16em] text-emerald-300">BrandFlow iç kullanım metrikleri</p><h2 className="mt-1 text-xl font-black">Genel görünüm</h2></div>
        <div className={`grid gap-3 sm:grid-cols-2 xl:grid-cols-4 ${loading ? "opacity-60" : ""}`}>
          <StatCard label="Toplam medya" value={metrics.totalMedia} helper={`${metrics.totalImages} görsel, ${metrics.totalVideos} video`} />
          <StatCard label="Takvim kayıtları" value={metrics.totalScheduledPosts} helper={`${metrics.postStatuses.scheduled} planlandı`} />
          <StatCard label="Advisor ortalaması" value={metrics.averageAdvisorScore ?? "-"} helper={`${metrics.advisorReports} analiz raporu`} />
          <StatCard label="En çok kullanılan" value={metrics.mostUsedPlatform ? platformLabels[metrics.mostUsedPlatform] : "-"} helper="Takvim + Advisor kayıtları" />
          <StatCard label="Son 7 gün medya" value={metrics.mediaLast7Days} helper="Oluşturulan veya yüklenen" />
          <StatCard label="Son 30 gün medya" value={metrics.mediaLast30Days} helper="Oluşturulan veya yüklenen" />
          <StatCard label="En aktif profil" value={metrics.mostActiveProfile?.name ?? "-"} helper={metrics.mostActiveProfile ? `${metrics.mostActiveProfile.count} iç kayıt` : "Henüz veri yok"} />
          <StatCard label="Başarısız plan" value={metrics.postStatuses.failed} helper={`${metrics.postStatuses.published} yayınlandı`} />
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <LineChart title="Medya oluşturma trendi" helper="Son 30 gündeki gerçek medya kayıtları" data={charts.mediaTrend} />
        <LineChart title="Advisor skor trendi" helper="Günlük ortalama AI Advisor skoru" data={charts.advisorScoreTrend} suffix="/100" />
        <BarChart title="Plan durumu dağılımı" helper="Seçili dönemdeki takvim kayıtları" data={charts.postStatusDistribution} />
        <BarChart title="Platform kullanımı" helper="Takvim ve Advisor iç kullanım toplamı" data={charts.platformDistribution} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="p-5"><div className="flex items-center justify-between"><h2 className="font-black">Yaklaşan paylaşımlar</h2><Link href="/calendar" className="text-xs font-bold text-emerald-300">Takvimi aç</Link></div><div className="mt-4 space-y-2">{data.upcomingPosts.length ? data.upcomingPosts.map((post) => <div key={post.id} className="rounded-lg border border-white/10 p-3"><div className="flex gap-2"><p className="min-w-0 flex-1 truncate text-sm font-bold">{post.title}</p><span className="text-xs text-emerald-300">{platformLabels[post.platform]}</span></div><p className="mt-1 text-xs text-zinc-500">{dateLabel(post.scheduledAt)}</p></div>) : <p className="text-sm text-zinc-500">Yaklaşan plan yok.</p>}</div></Card>
        <Card className="p-5"><div className="flex items-center justify-between"><h2 className="font-black">Son medyalar</h2><Link href="/media" className="text-xs font-bold text-emerald-300">Merkezi aç</Link></div><div className="mt-4 space-y-2">{data.recentMedia.length ? data.recentMedia.map((media) => <div key={media.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 p-3"><div className="min-w-0"><p className="truncate text-sm font-bold">{media.name}</p><p className="mt-1 text-xs text-zinc-500">{dateLabel(media.createdAt)}</p></div><span className="shrink-0 text-xs text-zinc-400">{media.type} · {bytes(media.size)}</span></div>) : <p className="text-sm text-zinc-500">Henüz medya yok.</p>}</div></Card>
        <Card className="p-5"><div className="flex items-center justify-between"><h2 className="font-black">Son öneriler</h2><Link href="/marketing-advisor" className="text-xs font-bold text-emerald-300">Advisor aç</Link></div><div className="mt-4 space-y-2">{data.recentRecommendations.length ? data.recentRecommendations.map((report) => <div key={report.id} className="rounded-lg border border-white/10 p-3"><div className="flex justify-between gap-2"><span className="text-xs font-bold text-emerald-300">{platformLabels[report.platform]}</span><span className="text-sm font-black">{report.score}/100</span></div><p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-400">{report.recommendation}</p></div>) : <p className="text-sm text-zinc-500">Henüz Advisor önerisi yok.</p>}</div></Card>
      </div>

      <Card className="border-dashed p-5"><p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Harici platform analitiği</p><h2 className="mt-2 text-lg font-black">Sosyal hesaplar bağlı değil</h2><p className="mt-2 text-sm leading-6 text-zinc-400">Erişim, beğeni, gösterim ve takipçi metrikleri gösterilmiyor. Bir sosyal analiz sağlayıcısı bağlandığında gerçek platform verileri burada yer alacak.</p></Card>
    </div>
  );
}
