"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, EmptyState } from "@/components/ui";
import type { ContentCalendarItem, ContentCalendarStatus } from "@/lib/calendar/content-types";
import type { MediaAsset } from "@/lib/media/types";
import type { SafeSocialConnection, SocialPlatform } from "@/lib/social/connections";

type CalendarView = "month" | "week";
type CalendarResponse = { data?: ContentCalendarItem[]; error?: string };
type MediaResponse = { data?: MediaAsset[]; error?: string };
type ConnectionResponse = { data?: SafeSocialConnection[]; error?: string };

const platformNames: Record<SocialPlatform, string> = { instagram: "Instagram", facebook: "Facebook", linkedin: "LinkedIn", x: "X", youtube: "YouTube", tiktok: "TikTok" };
const statusNames: Record<ContentCalendarStatus, string> = { draft: "Taslak", scheduled: "Planlandı", publishing: "Yayınlanıyor", processing: "İşleniyor", published: "Yayınlandı", failed: "Başarısız", cancelled: "İptal" };
const statusStyles: Record<ContentCalendarStatus, string> = { draft: "bg-zinc-500/15 text-zinc-300", scheduled: "bg-sky-400/15 text-sky-200", publishing: "bg-amber-400/15 text-amber-200", processing: "bg-amber-400/15 text-amber-200", published: "bg-emerald-400/15 text-emerald-200", failed: "bg-red-400/15 text-red-200", cancelled: "bg-zinc-500/15 text-zinc-400" };

function startDay(value: Date) { const date = new Date(value); date.setHours(0, 0, 0, 0); return date; }
function addDays(value: Date, count: number) { const date = new Date(value); date.setDate(date.getDate() + count); return date; }
function startWeek(value: Date) { const date = startDay(value); return addDays(date, -((date.getDay() + 6) % 7)); }
function daysFor(view: CalendarView, cursor: Date) {
  if (view === "week") return Array.from({ length: 7 }, (_, index) => addDays(startWeek(cursor), index));
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  return Array.from({ length: 42 }, (_, index) => addDays(startWeek(first), index));
}
function dateKey(value: Date | string) { const date = new Date(value); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function localInput(value: string) { const date = new Date(value); const offset = date.getTimezoneOffset() * 60000; return new Date(date.getTime() - offset).toISOString().slice(0, 16); }
function range(view: CalendarView, cursor: Date) { const days = daysFor(view, cursor); return { from: days[0], to: addDays(days[days.length - 1], 1) }; }

function MediaThumb({ media }: { media: MediaAsset | null }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    let active = true;
    if (!media?.storagePath) return;
    fetch(`/api/media/${media.id}/signed-url`, { method: "POST" }).then((response) => response.json()).then((json: { data?: { signedUrl?: string } }) => { if (active) setUrl(json.data?.signedUrl || ""); }).catch(() => undefined);
    return () => { active = false; };
  }, [media]);
  if (!media) return <div className="grid h-14 w-14 shrink-0 place-items-center rounded-md bg-white/5 text-[10px] font-bold text-zinc-500">METİN</div>;
  if (!url) return <div className="h-14 w-14 shrink-0 animate-pulse rounded-md bg-white/5" />;
  return media.type === "video" ? <video src={url} muted className="h-14 w-14 shrink-0 rounded-md bg-black object-cover" /> : <Image src={url} alt="" width={56} height={56} unoptimized className="h-14 w-14 shrink-0 rounded-md bg-black object-cover" />;
}

export function CalendarClient() {
  const [items, setItems] = useState<ContentCalendarItem[]>([]);
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [connections, setConnections] = useState<SafeSocialConnection[]>([]);
  const [view, setView] = useState<CalendarView>("month");
  const [cursor, setCursor] = useState(new Date());
  const [filter, setFilter] = useState<SocialPlatform | "all">("all");
  const [selectedId, setSelectedId] = useState("");
  const [title, setTitle] = useState(""); const [caption, setCaption] = useState("");
  const [mediaId, setMediaId] = useState(""); const [platforms, setPlatforms] = useState<SocialPlatform[]>([]);
  const [scheduledAt, setScheduledAt] = useState(() => localInput(new Date(Date.now() + 3600000).toISOString()));
  const [timezone, setTimezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  const [status, setStatus] = useState<"draft" | "scheduled">("scheduled");
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false);
  const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  const selectedItem = useMemo(() => items.find((item) => item.id === selectedId) || null, [items, selectedId]);
  const selectedLocked = Boolean(selectedItem && ["publishing", "processing", "published", "cancelled"].includes(selectedItem.status));

  const connectedPlatforms = useMemo(() => [...new Set(connections.filter((item) => item.status === "connected").map((item) => item.platform))], [connections]);
  const visibleDays = useMemo(() => daysFor(view, cursor), [view, cursor]);
  const grouped = useMemo(() => items.reduce<Record<string, ContentCalendarItem[]>>((result, item) => { const key = dateKey(item.scheduledAt); (result[key] ||= []).push(item); return result; }, {}), [items]);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const dates = range(view, cursor); const params = new URLSearchParams({ from: dates.from.toISOString(), to: dates.to.toISOString() }); if (filter !== "all") params.set("platform", filter);
      const [calendarResult, mediaResult, connectionResult] = await Promise.all([fetch(`/api/calendar?${params}`), fetch("/api/media?sort=newest"), fetch("/api/connections")]);
      const calendarJson = await calendarResult.json() as CalendarResponse; const mediaJson = await mediaResult.json() as MediaResponse; const connectionJson = await connectionResult.json() as ConnectionResponse;
      if (!calendarResult.ok || !calendarJson.data) throw new Error(calendarJson.error || "Takvim yüklenemedi.");
      setItems(calendarJson.data); if (mediaResult.ok && mediaJson.data) setMedia(mediaJson.data.filter((item) => item.type === "image" || item.type === "video"));
      if (connectionResult.ok && connectionJson.data) setConnections(connectionJson.data);
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Takvim yüklenemedi."); } finally { setLoading(false); }
  }, [cursor, filter, view]);

  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load]);

  function reset(day = new Date()) { setSelectedId(""); setTitle(""); setCaption(""); setMediaId(""); setPlatforms([]); setStatus("scheduled"); setScheduledAt(localInput(day.toISOString())); setNotice(""); }
  function edit(item: ContentCalendarItem) { setSelectedId(item.id); setTitle(item.title); setCaption(item.caption); setMediaId(item.mediaAssetId || ""); setPlatforms(item.platforms); setStatus(item.status === "draft" ? "draft" : "scheduled"); setScheduledAt(localInput(item.scheduledAt)); setTimezone(item.timezone); }
  function togglePlatform(platform: SocialPlatform) { setPlatforms((current) => current.includes(platform) ? current.filter((item) => item !== platform) : [...current, platform]); }

  async function save() {
    if (selectedLocked) return setError("İşlenen, yayınlanan veya iptal edilen plan değiştirilemez.");
    if (!title.trim()) return setError("Başlık yazmalısın."); if (platforms.length === 0) return setError("En az bir bağlı platform seçmelisin.");
    setSaving(true); setError(""); setNotice("");
    try {
      const response = await fetch(selectedId ? `/api/calendar/${selectedId}` : "/api/calendar", { method: selectedId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, caption, mediaAssetId: mediaId || null, platforms, status, scheduledAt: new Date(scheduledAt).toISOString(), timezone }) });
      const json = await response.json() as { data?: ContentCalendarItem; error?: string }; if (!response.ok || !json.data) throw new Error(json.error || "Plan kaydedilemedi.");
      edit(json.data); setNotice(selectedId ? "Plan güncellendi." : "Plan oluşturuldu."); await load();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Plan kaydedilemedi."); } finally { setSaving(false); }
  }

  async function remove() { if (!selectedId || !window.confirm("Bu planı silmek istiyor musun?")) return; setSaving(true); const response = await fetch(`/api/calendar/${selectedId}`, { method: "DELETE" }); setSaving(false); if (!response.ok) return setError("Plan silinemedi."); reset(); setNotice("Plan silindi."); await load(); }
  async function duplicate() { if (!selectedId) return; setSaving(true); const response = await fetch(`/api/calendar/${selectedId}`, { method: "POST" }); const json = await response.json() as { data?: ContentCalendarItem; error?: string }; setSaving(false); if (!response.ok || !json.data) return setError(json.error || "Plan kopyalanamadı."); edit(json.data); setNotice("Plan taslak olarak kopyalandı."); await load(); }

  const heading = view === "month" ? cursor.toLocaleDateString("tr-TR", { month: "long", year: "numeric" }) : `${visibleDays[0].toLocaleDateString("tr-TR", { day: "2-digit", month: "short" })} - ${visibleDays[6].toLocaleDateString("tr-TR", { day: "2-digit", month: "short" })}`;

  return <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
    <Card className="p-5"><div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-[0.16em] text-zinc-500">İçerik planı</p><h2 className="mt-2 text-xl font-black">{selectedId ? "Planı düzenle" : "Yeni plan"}</h2></div><Button variant="secondary" onClick={() => reset()}>Yeni</Button></div>
      <div className="mt-5 grid gap-4">
        <label className="text-sm font-semibold">Başlık<input value={title} onChange={(event) => setTitle(event.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 outline-none focus:border-emerald-300" /></label>
        <label className="text-sm font-semibold">Açıklama<textarea value={caption} onChange={(event) => setCaption(event.target.value)} rows={4} className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 outline-none focus:border-emerald-300" /></label>
        <label className="text-sm font-semibold">Medya<select value={mediaId} onChange={(event) => setMediaId(event.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-zinc-950 px-4 py-3"><option value="">Medya seçme</option>{media.map((item) => <option key={item.id} value={item.id}>{item.type === "video" ? "Video" : "Görsel"} · {item.name}</option>)}</select></label>
        <div><p className="text-sm font-semibold">Bağlı platformlar</p>{connectedPlatforms.length ? <div className="mt-2 grid grid-cols-2 gap-2">{connectedPlatforms.map((platform) => <label key={platform} className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm ${platforms.includes(platform) ? "border-emerald-400/40 bg-emerald-400/10" : "border-white/10"}`}><input type="checkbox" checked={platforms.includes(platform)} onChange={() => togglePlatform(platform)} />{platformNames[platform]}</label>)}</div> : <p className="mt-2 rounded-lg border border-amber-400/20 bg-amber-400/10 p-3 text-sm text-amber-100">Bağlı hesap yok. <Link href="/connections" className="font-bold underline">Bağlantılara git</Link></p>}</div>
        <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold">Tarih ve saat<input type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-3" /></label><label className="text-sm font-semibold">Durum<select value={status} onChange={(event) => setStatus(event.target.value as "draft" | "scheduled")} className="mt-2 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-3"><option value="scheduled">Planlandı</option><option value="draft">Taslak</option></select></label></div>
        <label className="text-sm font-semibold">Zaman dilimi<input value={timezone} onChange={(event) => setTimezone(event.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-zinc-950 px-4 py-3" /></label>
        {error && <p className="rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}{notice && <p className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-100">{notice}</p>}
        <Button onClick={() => void save()} disabled={saving || selectedLocked}>{saving ? "Kaydediliyor" : selectedId ? "Güncelle" : "Planla"}</Button>{selectedId && <div className="grid grid-cols-2 gap-2"><Button variant="secondary" onClick={() => void duplicate()} disabled={saving || selectedLocked}>Kopyala</Button><Button variant="secondary" onClick={() => void remove()} disabled={saving || selectedLocked}>{selectedItem?.kind === "scheduled_publish" ? "İptal Et" : "Sil"}</Button></div>}
      </div>
    </Card>
    <div className="min-w-0"><Card className="p-5"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Takvim</p><h2 className="mt-2 text-2xl font-black capitalize">{heading}</h2></div><div className="flex flex-wrap gap-2"><div className="inline-flex rounded-lg border border-white/10 p-1">{(["month", "week"] as CalendarView[]).map((option) => <button key={option} onClick={() => setView(option)} className={`rounded-md px-3 py-2 text-sm font-bold ${view === option ? "bg-white text-zinc-950" : "text-zinc-400"}`}>{option === "month" ? "Ay" : "Hafta"}</button>)}</div><select value={filter} onChange={(event) => setFilter(event.target.value as SocialPlatform | "all")} className="rounded-lg border border-white/10 bg-zinc-950 px-3 text-sm"><option value="all">Tüm platformlar</option>{connectedPlatforms.map((platform) => <option key={platform} value={platform}>{platformNames[platform]}</option>)}</select><Button variant="secondary" onClick={() => setCursor(addDays(cursor, view === "month" ? -30 : -7))}>Önceki</Button><Button variant="secondary" onClick={() => setCursor(new Date())}>Bugün</Button><Button variant="secondary" onClick={() => setCursor(addDays(cursor, view === "month" ? 30 : 7))}>Sonraki</Button></div></div></Card>
      <div className="mt-4 overflow-x-auto">{loading ? <div className="grid min-w-[840px] grid-cols-7 gap-2">{Array.from({ length: view === "month" ? 42 : 7 }, (_, index) => <div key={index} className="h-40 animate-pulse rounded-lg border border-white/10 bg-white/5" />)}</div> : error && items.length === 0 ? <Card className="p-8 text-center"><p>{error}</p><Button className="mt-4" onClick={() => void load()}>Tekrar dene</Button></Card> : items.length === 0 ? <EmptyState title="Takvim boş" description="İlk içerik planını oluşturarak paylaşım akışını düzenlemeye başla." /> : <div className="grid min-w-[840px] grid-cols-7 gap-2">{visibleDays.map((day) => <div key={day.toISOString()} className={`min-h-40 rounded-lg border p-2 ${day.getMonth() === cursor.getMonth() || view === "week" ? "border-white/10 bg-[#111113]" : "border-white/5 bg-white/[0.02]"}`}><button onClick={() => reset(day)} className="mb-2 text-xs font-bold text-zinc-400 hover:text-white">{day.toLocaleDateString("tr-TR", { day: "2-digit", weekday: "short" })}</button><div className="space-y-2">{(grouped[dateKey(day)] || []).map((item) => <button key={item.id} onClick={() => edit(item)} className="w-full rounded-md border border-white/10 bg-white/[0.04] p-2 text-left hover:border-emerald-400/30"><div className="flex gap-2"><MediaThumb media={item.media} /><div className="min-w-0"><p className="truncate text-xs font-black">{item.title}</p><p className="mt-1 line-clamp-2 text-[11px] leading-4 text-zinc-500">{item.caption || "Açıklama yok"}</p></div></div><div className="mt-2 flex items-center justify-between gap-2"><span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${statusStyles[item.status]}`}>{statusNames[item.status]}</span><span className="text-[10px] text-zinc-500">{new Date(item.scheduledAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</span></div><div className="mt-2 flex flex-wrap gap-1">{item.platforms.map((platform) => <span key={platform} className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] text-zinc-400">{platformNames[platform]}</span>)}</div></button>)}</div></div>)}</div>}</div>
    </div>
  </div>;
}
