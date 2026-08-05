"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BarChart, LineChart } from "@/components/analytics/Charts";
import { Button, Card, EmptyState, StatCard } from "@/components/ui";
import type { AnalyticsOverview } from "@/lib/analytics/server";

type ApiResponse = { data?: AnalyticsOverview; error?: string };
const platformNames: Record<string, string> = { instagram: "Instagram", facebook: "Facebook", linkedin: "LinkedIn", x: "X", youtube: "YouTube", tiktok: "TikTok" };

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
function dateLabel(value: string) { return new Date(value).toLocaleString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); }
function remainingLabel(value: number | null) { return value === null ? "Sınırsız" : String(value); }

export function AnalyticsClient() {
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    fetch("/api/analytics", { cache: "no-store" })
      .then(async (response) => { const json = await response.json() as ApiResponse; if (!response.ok || !json.data) throw new Error(json.error || "Analitik verileri yüklenemedi."); return json.data; })
      .then((result) => { if (active) { setData(result); setError(""); } })
      .catch((loadError: unknown) => { if (active) setError(loadError instanceof Error ? loadError.message : "Analitik verileri yüklenemedi."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [retry]);

  if (loading && !data) return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }, (_, index) => <div key={index} className="h-28 animate-pulse rounded-lg border border-white/10 bg-white/5" />)}</div>;
  if (error && !data) return <Card className="p-8 text-center"><h2 className="text-xl font-black">Analitik verileri yüklenemedi</h2><p className="mt-2 text-sm text-zinc-400">{error}</p><Button className="mt-5" onClick={() => { setLoading(true); setRetry((value) => value + 1); }}>Tekrar dene</Button></Card>;
  if (!data) return null;

  const { metrics, charts } = data;
  const empty = metrics.totalImages + metrics.totalVideos + metrics.scheduledPosts + metrics.publishedPosts + metrics.connectedAccounts === 0;

  return <div className="space-y-5">
    {error && <div className="rounded-lg border border-amber-400/20 bg-amber-400/10 p-3 text-sm text-amber-100">{error}</div>}
    {empty && <EmptyState title="Henüz analitik verisi yok" description="Medya oluşturduğunda, hesap bağladığında veya içerik planladığında gerçek kullanım verileri burada görünür." />}

    <section><div className="mb-3"><p className="text-xs uppercase tracking-[0.16em] text-emerald-300">BrandFlow iç kullanım metrikleri</p><h2 className="mt-1 text-xl font-black">Genel görünüm</h2></div>
      <div className={`grid gap-3 sm:grid-cols-2 xl:grid-cols-4 ${loading ? "opacity-60" : ""}`}>
        <StatCard label="Toplam AI Görseli" value={metrics.totalImages} helper="Media Center görsel kayıtları" />
        <StatCard label="Toplam AI Videosu" value={metrics.totalVideos} helper="Media Center video kayıtları" />
        <StatCard label="Planlanan İçerik" value={metrics.scheduledPosts} helper="Yayın sırasını bekleyen" />
        <StatCard label="Yayınlanan İçerik" value={metrics.publishedPosts} helper="Gerçek published kayıtları" />
        <StatCard label="Bağlı Hesaplar" value={metrics.connectedAccounts} helper="Connected durumundaki hesaplar" />
        <StatCard label="Kullanılan Alan" value={formatBytes(metrics.storageUsed)} helper="Private medya dosyaları" />
        <StatCard label="Abonelik Planı" value={metrics.subscriptionPlanName} helper={metrics.subscriptionPlan.toUpperCase()} />
        <StatCard label="Kalan Kullanım" value={`${remainingLabel(metrics.remainingUsage.images)} / ${remainingLabel(metrics.remainingUsage.videos)}`} helper="Görsel / video" />
      </div>
    </section>

    <div className="grid gap-4 xl:grid-cols-2">
      <LineChart title="Son 30 günde oluşturulan içerik" helper="Gerçek media_assets kayıtları" data={charts.contentTrend} />
      <BarChart title="Platform kullanımı" helper="Takvim planlarında seçilen platformlar" data={charts.platformUsage.map((point) => ({ ...point, label: platformNames[point.label] || point.label }))} />
      <BarChart title="AI görselleri ve videoları" helper="Media Center tür dağılımı" data={charts.mediaTypes} />
      <BarChart title="Planlanan ve yayınlanan" helper="Gerçek takvim durumları" data={charts.scheduleStatuses} />
    </div>

    <div className="grid gap-4 xl:grid-cols-3">
      <Card className="p-5"><h2 className="font-black">Son aktiviteler</h2><div className="mt-4 space-y-2">{data.recentActivity.length ? data.recentActivity.map((item) => <div key={item.id} className="rounded-lg border border-white/10 p-3"><div className="flex justify-between gap-3"><p className="truncate text-sm font-bold">{item.title}</p><span className="shrink-0 text-[10px] uppercase text-zinc-500">{item.kind}</span></div><p className="mt-1 text-xs text-zinc-400">{item.detail}</p><p className="mt-1 text-[11px] text-zinc-600">{dateLabel(item.occurredAt)}</p></div>) : <p className="text-sm text-zinc-500">Aktivite bulunmuyor.</p>}</div></Card>
      <Card className="p-5"><div className="flex justify-between gap-3"><h2 className="font-black">Yaklaşan planlar</h2><Link href="/calendar" className="text-xs font-bold text-emerald-300">Takvimi aç</Link></div><div className="mt-4 space-y-2">{data.upcomingPosts.length ? data.upcomingPosts.map((post) => <div key={post.id} className="rounded-lg border border-white/10 p-3"><p className="truncate text-sm font-bold">{post.title}</p><p className="mt-1 text-xs text-emerald-300">{post.platforms.map((platform) => platformNames[platform]).join(", ")}</p><p className="mt-1 text-xs text-zinc-500">{dateLabel(post.scheduledAt)}</p></div>) : <p className="text-sm text-zinc-500">Yaklaşan plan yok.</p>}</div></Card>
      <Card className="p-5"><div className="flex justify-between gap-3"><h2 className="font-black">Son medya</h2><Link href="/media" className="text-xs font-bold text-emerald-300">Merkezi aç</Link></div><div className="mt-4 space-y-2">{data.recentMedia.length ? data.recentMedia.map((media) => <div key={media.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 p-3"><div className="min-w-0"><p className="truncate text-sm font-bold">{media.name}</p><p className="mt-1 text-xs text-zinc-500">{dateLabel(media.createdAt)}</p></div><div className="text-right"><p className="text-xs font-bold capitalize text-zinc-300">{media.type}</p><p className="mt-1 text-[11px] text-zinc-500">{formatBytes(media.size)}</p></div></div>) : <p className="text-sm text-zinc-500">Medya bulunmuyor.</p>}</div></Card>
    </div>

    <Card className="border-dashed p-5"><p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Harici sosyal analitik</p><h2 className="mt-2 text-lg font-black">Platform analitik sağlayıcısı bağlı değil</h2><p className="mt-2 text-sm leading-6 text-zinc-400">Erişim, gösterim, beğeni veya takipçi sayısı üretilmiyor. Bu ekran yalnızca BrandFlow içindeki gerçek kullanım kayıtlarını gösterir.</p></Card>
  </div>;
}
