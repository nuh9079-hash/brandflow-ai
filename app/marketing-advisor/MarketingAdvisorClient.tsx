"use client";

import { useCallback, useEffect, useState } from "react";
import { BarChart3, Check, Clock3, History, Loader2, Sparkles, Trash2 } from "lucide-react";
import { Button, Card, EmptyState, Input } from "@/components/ui";
import type { MarketingStrategy, StrategyReport } from "@/lib/marketing/strategy";
import { socialPlatforms, type SocialPlatform } from "@/lib/social/connections";

type ApiResponse<T> = { data?: T; error?: string };
const labels: Record<SocialPlatform, string> = { instagram: "Instagram", facebook: "Facebook", linkedin: "LinkedIn", x: "X", youtube: "YouTube", tiktok: "TikTok" };
const emptyForm = { businessName: "", industry: "", targetAudience: "", goals: "", website: "", platforms: [] as SocialPlatform[] };

function ListSection({ title, items }: { title: string; items: string[] }) {
  return <Card className="p-5"><h3 className="font-semibold text-white">{title}</h3><ul className="mt-4 space-y-3">{items.map((item, index) => <li key={`${title}-${index}`} className="flex gap-3 text-sm leading-6 text-zinc-300"><Check className="mt-1 h-4 w-4 shrink-0 text-emerald-400" /><span>{item}</span></li>)}</ul></Card>;
}

function ReportView({ report }: { report: MarketingStrategy }) {
  return <div className="space-y-5">
    <div className="grid gap-4 lg:grid-cols-[180px_1fr]">
      <Card className="flex min-h-40 flex-col items-center justify-center p-5 text-center"><BarChart3 className="mb-3 h-6 w-6 text-violet-400" /><strong className="text-4xl text-white">{report.marketingScore}</strong><span className="mt-1 text-xs uppercase text-zinc-500">Pazarlama puanı</span></Card>
      <Card className="p-5"><h3 className="font-semibold text-white">Yönetici Özeti</h3><p className="mt-4 text-sm leading-7 text-zinc-300">{report.executiveSummary}</p></Card>
    </div>
    <div className="grid gap-4 xl:grid-cols-2"><ListSection title="Büyüme Fırsatları" items={report.growthOpportunities} /><ListSection title="Geliştirilmesi Gerekenler" items={report.weaknesses} /><ListSection title="İçerik Stratejisi" items={report.contentStrategy} /><ListSection title="SEO Önerileri" items={report.seoSuggestions} /><ListSection title="Reklam Fikirleri" items={report.advertisingIdeas} /><ListSection title="CTA Önerileri" items={report.ctaRecommendations} /></div>
    <Card className="p-5"><h3 className="font-semibold text-white">Marka Konumlandırması</h3><p className="mt-4 text-sm leading-7 text-zinc-300">{report.brandPositioning}</p></Card>
    <Card className="overflow-hidden p-0"><div className="border-b border-white/10 px-5 py-4"><h3 className="font-semibold text-white">Haftalık İçerik Planı</h3></div><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-white/[0.03] text-xs uppercase text-zinc-500"><tr><th className="p-4">Gün</th><th className="p-4">Konu</th><th className="p-4">Format</th><th className="p-4">Platform</th><th className="p-4">CTA</th></tr></thead><tbody className="divide-y divide-white/10">{report.weeklyContentPlan.map((item, index) => <tr key={`${item.day}-${index}`} className="text-zinc-300"><td className="p-4 font-medium text-white">{item.day}</td><td className="p-4">{item.topic}</td><td className="p-4">{item.format}</td><td className="p-4">{item.platform}</td><td className="p-4">{item.cta}</td></tr>)}</tbody></table></div></Card>
  </div>;
}

export function MarketingAdvisorClient() {
  const [tab, setTab] = useState<"advisor" | "history">("advisor");
  const [form, setForm] = useState(emptyForm);
  const [report, setReport] = useState<StrategyReport | null>(null);
  const [history, setHistory] = useState<StrategyReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState("");

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true); setError("");
    try { const response = await fetch("/api/marketing-advisor/history", { cache: "no-store" }); const json = await response.json() as ApiResponse<StrategyReport[]>; if (!response.ok) throw new Error(json.error || "Rapor geçmişi alınamadı."); setHistory(json.data || []); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Rapor geçmişi alınamadı."); }
    finally { setHistoryLoading(false); }
  }, []);

  useEffect(() => {
    if (tab !== "history") return;
    const timer = window.setTimeout(() => void loadHistory(), 0);
    return () => window.clearTimeout(timer);
  }, [tab, loadHistory]);

  function togglePlatform(platform: SocialPlatform) { setForm((current) => ({ ...current, platforms: current.platforms.includes(platform) ? current.platforms.filter((item) => item !== platform) : [...current.platforms, platform] })); }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); if (!form.platforms.length) { setError("En az bir sosyal platform seçmelisin."); return; } setLoading(true);
    try { const response = await fetch("/api/marketing-advisor/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }); const json = await response.json() as ApiResponse<StrategyReport>; if (!response.ok || !json.data) throw new Error(json.error || "Pazarlama analizi oluşturulamadı."); setReport(json.data); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Pazarlama analizi oluşturulamadı."); }
    finally { setLoading(false); }
  }
  function reopen(item: StrategyReport) { setForm({ businessName: item.businessName, industry: item.industry, targetAudience: item.targetAudience, goals: item.goals, website: item.website, platforms: item.platforms }); setReport(item); setError(""); setTab("advisor"); }
  async function remove(id: string) { setError(""); try { const response = await fetch(`/api/marketing-advisor/history?id=${encodeURIComponent(id)}`, { method: "DELETE" }); const json = await response.json() as ApiResponse<{ id: string }>; if (!response.ok) throw new Error(json.error || "Rapor silinemedi."); setHistory((current) => current.filter((item) => item.id !== id)); if (report?.id === id) setReport(null); } catch (cause) { setError(cause instanceof Error ? cause.message : "Rapor silinemedi."); } }

  return <div className="space-y-6">
    <div className="inline-flex rounded-md border border-white/10 bg-zinc-950 p-1"><button type="button" onClick={() => setTab("advisor")} className={`flex items-center gap-2 rounded px-4 py-2 text-sm ${tab === "advisor" ? "bg-violet-600 text-white" : "text-zinc-400"}`}><Sparkles className="h-4 w-4" />Danışman</button><button type="button" onClick={() => setTab("history")} className={`flex items-center gap-2 rounded px-4 py-2 text-sm ${tab === "history" ? "bg-violet-600 text-white" : "text-zinc-400"}`}><History className="h-4 w-4" />Geçmiş</button></div>
    {error ? <div role="alert" className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div> : null}
    {tab === "advisor" ? <div className="grid items-start gap-6 xl:grid-cols-[390px_minmax(0,1fr)]">
      <Card className="p-5 xl:sticky xl:top-6"><div className="mb-5"><h2 className="text-lg font-semibold text-white">İşletmeni analiz et</h2><p className="mt-1 text-sm leading-6 text-zinc-400">Verdiğin bilgiler ve gerçek BrandFlow kullanım verilerin üzerinden uygulanabilir bir strateji oluştur.</p></div><form className="space-y-4" onSubmit={submit}>
        <Input label="İşletme adı" required value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} placeholder="Örn. BrandFlow" />
        <Input label="Sektör" required value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} placeholder="Örn. E-ticaret" />
        <label className="block"><span className="mb-2 block text-sm font-medium text-zinc-300">Hedef kitle</span><textarea required rows={3} value={form.targetAudience} onChange={(e) => setForm({ ...form, targetAudience: e.target.value })} className="w-full rounded-md border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-violet-500" /></label>
        <label className="block"><span className="mb-2 block text-sm font-medium text-zinc-300">Hedefler</span><textarea required rows={3} value={form.goals} onChange={(e) => setForm({ ...form, goals: e.target.value })} className="w-full rounded-md border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-violet-500" /></label>
        <Input label="Website (isteğe bağlı)" type="url" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://" />
        <fieldset><legend className="mb-2 text-sm font-medium text-zinc-300">Mevcut sosyal platformlar</legend><div className="grid grid-cols-2 gap-2">{socialPlatforms.map((platform) => <label key={platform} className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm ${form.platforms.includes(platform) ? "border-violet-500/60 bg-violet-500/10 text-white" : "border-white/10 text-zinc-400"}`}><input type="checkbox" className="accent-violet-500" checked={form.platforms.includes(platform)} onChange={() => togglePlatform(platform)} />{labels[platform]}</label>)}</div></fieldset>
        <Button type="submit" className="w-full" disabled={loading} aria-busy={loading}>
          <span className={`items-center gap-2 ${loading ? "hidden" : "inline-flex"}`}>
            <Sparkles className="h-4 w-4" />
            Pazarlama Analizi Oluştur
          </span>
          <span className={`items-center gap-2 ${loading ? "inline-flex" : "hidden"}`} aria-live="polite">
            <Loader2 className="h-4 w-4 animate-spin" />
            Gemini raporu hazırlıyor
          </span>
        </Button>
      </form></Card><div>{report ? <ReportView report={report.report} /> : <EmptyState title="İlk strateji raporunu oluştur" description="Büyüme fırsatları, içerik planı, reklam fikirleri ve pazarlama puanı burada görünecek." />}</div>
    </div> : historyLoading ? <Card className="flex min-h-64 items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-violet-400" /><span className="ml-3 text-sm text-zinc-400">Raporlar yükleniyor...</span></Card> : history.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{history.map((item) => <Card key={item.id} className="p-5"><div className="flex items-start justify-between gap-4"><div><h3 className="font-semibold text-white">{item.businessName}</h3><p className="mt-1 text-sm text-zinc-500">{item.industry}</p></div><span className="rounded bg-violet-500/10 px-2 py-1 text-sm font-semibold text-violet-300">{item.report.marketingScore}/100</span></div><p className="mt-4 line-clamp-3 text-sm leading-6 text-zinc-400">{item.report.executiveSummary}</p><div className="mt-4 flex items-center gap-2 text-xs text-zinc-500"><Clock3 className="h-3.5 w-3.5" />{new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.createdAt))}</div><div className="mt-5 flex gap-2"><Button className="flex-1" variant="secondary" onClick={() => reopen(item)}>Aç</Button><Button variant="secondary" aria-label="Raporu sil" onClick={() => void remove(item.id)}><Trash2 className="h-4 w-4" /></Button></div></Card>)}</div> : <EmptyState title="Henüz rapor yok" description="Oluşturduğun pazarlama stratejileri burada listelenecek." />}
  </div>;
}
