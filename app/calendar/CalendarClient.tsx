"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Card, EmptyState } from "@/components/ui";
import type { CalendarPlatform, CalendarStatus, ScheduledPost } from "@/lib/calendar/types";
import type { MediaAsset } from "@/lib/media/types";

type CalendarView = "month" | "week" | "day";
type CalendarResponse = { data?: ScheduledPost[]; error?: string };
type PostResponse = { data?: ScheduledPost; error?: string };
type MediaResponse = { data?: MediaAsset[]; error?: string };
type Readiness = {
  platform: CalendarPlatform;
  supported: boolean;
  connected: boolean;
  accountName: string | null;
  schedulerEnabled: boolean;
  schedulerActive: boolean;
  backgroundReady: boolean;
  message: string;
};
type ReadinessResponse = { data?: Readiness; error?: string };

const platforms: Array<{ value: CalendarPlatform; label: string }> = [
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "twitter", label: "X" },
  { value: "tiktok", label: "TikTok" },
  { value: "linkedin", label: "LinkedIn" },
];

const statuses: Array<{ value: CalendarStatus; label: string }> = [
  { value: "draft", label: "Taslak" },
  { value: "scheduled", label: "Planlandı" },
  { value: "published", label: "Yayınlandı" },
  { value: "failed", label: "Başarısız" },
];

const viewLabels: Record<CalendarView, string> = { month: "Ay", week: "Hafta", day: "Gün" };
const statusClasses: Record<CalendarStatus, string> = {
  draft: "border-zinc-500/30 bg-zinc-500/10 text-zinc-200",
  scheduled: "border-sky-400/30 bg-sky-400/10 text-sky-100",
  published: "border-emerald-400/30 bg-emerald-400/10 text-emerald-100",
  failed: "border-red-400/30 bg-red-500/10 text-red-100",
};

function startOfDay(date: Date) { const next = new Date(date); next.setHours(0, 0, 0, 0); return next; }
function addDays(date: Date, days: number) { const next = new Date(date); next.setDate(next.getDate() + days); return next; }
function startOfWeek(date: Date) { const next = startOfDay(date); return addDays(next, -((next.getDay() + 6) % 7)); }
function monthDays(date: Date) { const first = new Date(date.getFullYear(), date.getMonth(), 1); const start = startOfWeek(first); return Array.from({ length: 42 }, (_, index) => addDays(start, index)); }
function weekDays(date: Date) { const start = startOfWeek(date); return Array.from({ length: 7 }, (_, index) => addDays(start, index)); }
function dayKey(value: Date | string | null | undefined) { if (!value) return ""; const date = value instanceof Date ? value : new Date(value); if (Number.isNaN(date.getTime())) return ""; return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function datetimeLocal(value: string | null | undefined) { if (!value) return ""; const date = new Date(value); if (Number.isNaN(date.getTime())) return ""; return `${dayKey(date)}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`; }
function isoFromLocal(value: string) { if (!value) return null; const date = new Date(value); return Number.isNaN(date.getTime()) ? null : date.toISOString(); }
function movePostToDay(post: ScheduledPost, date: Date) { const current = post.scheduledAt ? new Date(post.scheduledAt) : new Date(); const next = new Date(date); next.setHours(current.getHours(), current.getMinutes(), 0, 0); return next.toISOString(); }
function formatTime(value: string | null | undefined) { if (!value) return "Saat yok"; return new Date(value).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }); }
function postDateLabel(value: string | null | undefined) { if (!value) return "Taslak"; return new Date(value).toLocaleString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); }
function rangeForView(view: CalendarView, cursor: Date) { if (view === "day") return { from: startOfDay(cursor), to: addDays(startOfDay(cursor), 1) }; if (view === "week") { const from = startOfWeek(cursor); return { from, to: addDays(from, 7) }; } const days = monthDays(cursor); return { from: days[0], to: addDays(days[days.length - 1], 1) }; }
function platformLabel(platform: CalendarPlatform) { return platforms.find((item) => item.value === platform)?.label || platform; }

export function CalendarClient() {
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [mediaItems, setMediaItems] = useState<MediaAsset[]>([]);
  const [view, setView] = useState<CalendarView>("month");
  const [cursor, setCursor] = useState(() => new Date());
  const [platformFilter, setPlatformFilter] = useState<CalendarPlatform | "all">("all");
  const [selectedId, setSelectedId] = useState("");
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [platform, setPlatform] = useState<CalendarPlatform>("instagram");
  const [mediaAssetId, setMediaAssetId] = useState("");
  const [scheduledAt, setScheduledAt] = useState(() => datetimeLocal(new Date(Date.now() + 60 * 60_000).toISOString()));
  const [timezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  const [autoPublish, setAutoPublish] = useState(false);
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [readinessLoading, setReadinessLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const visibleDays = useMemo(() => view === "day" ? [startOfDay(cursor)] : view === "week" ? weekDays(cursor) : monthDays(cursor), [cursor, view]);
  const selectedPost = posts.find((post) => post.id === selectedId) || null;

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const range = rangeForView(view, cursor);
      const params = new URLSearchParams({ from: range.from.toISOString(), to: range.to.toISOString(), platform: platformFilter });
      const [calendarResponse, mediaResponse] = await Promise.all([fetch(`/api/calendar?${params.toString()}`, { cache: "no-store" }), fetch("/api/media?sort=newest", { cache: "no-store" })]);
      const calendarJson = (await calendarResponse.json()) as CalendarResponse;
      const mediaJson = (await mediaResponse.json()) as MediaResponse;
      if (!calendarResponse.ok || !calendarJson.data) throw new Error(calendarJson.error || "Takvim yüklenemedi.");
      setPosts(calendarJson.data);
      if (mediaResponse.ok && mediaJson.data) setMediaItems(mediaJson.data.filter((item) => item.type === "image" || item.type === "video"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Takvim yüklenemedi.");
    } finally { setLoading(false); }
  }

  async function loadReadiness(nextPlatform: CalendarPlatform) {
    setReadinessLoading(true);
    try {
      const response = await fetch(`/api/calendar/readiness?platform=${encodeURIComponent(nextPlatform)}`, { cache: "no-store" });
      const json = (await response.json()) as ReadinessResponse;
      setReadiness(response.ok && json.data ? json.data : null);
    } catch { setReadiness(null); }
    finally { setReadinessLoading(false); }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, cursor, platformFilter]);
  useEffect(() => { const timer = window.setTimeout(() => void loadReadiness(platform), 0); return () => window.clearTimeout(timer); }, [platform]);
  useEffect(() => { if (autoPublish && readiness && !readiness.backgroundReady) setAutoPublish(false); }, [autoPublish, readiness]);

  function resetForm(date?: Date) {
    setSelectedId(""); setTitle(""); setCaption(""); setPlatform(platformFilter === "all" ? "instagram" : platformFilter); setMediaAssetId(""); setAutoPublish(false); setConfirmDelete(false); setError(""); setNotice("");
    const base = date ? new Date(date) : new Date(Date.now() + 60 * 60_000); if (date) base.setHours(19, 0, 0, 0); setScheduledAt(datetimeLocal(base.toISOString()));
  }

  function editPost(post: ScheduledPost) {
    setSelectedId(post.id); setTitle(post.title); setCaption(post.caption); setPlatform(post.platform); setMediaAssetId(post.mediaAssetId || ""); setScheduledAt(datetimeLocal(post.scheduledAt || new Date().toISOString())); setAutoPublish(post.autoPublish); setConfirmDelete(false); setError(""); setNotice("");
  }

  function validate(nextStatus: "draft" | "scheduled") {
    if (!title.trim()) return "Paylaşımı takvimde bulabilmek için bir başlık yaz.";
    if (nextStatus === "scheduled" && !scheduledAt) return "Paylaşım tarihini ve saatini seç.";
    if (nextStatus === "scheduled" && scheduledAt && new Date(scheduledAt).getTime() < Date.now() - 60_000) return "Planlama saati geçmişte olamaz.";
    if (autoPublish && !readiness?.backgroundReady) return readiness?.message || "Otomatik yayın altyapısı henüz hazır değil.";
    if (autoPublish && platform === "instagram" && !mediaAssetId) return "Instagram otomatik yayını için bir görsel veya video seç.";
    return "";
  }

  async function persist(nextStatus: "draft" | "scheduled"): Promise<ScheduledPost | null> {
    const validation = validate(nextStatus); if (validation) { setError(validation); return null; }
    setSaving(true); setError(""); setNotice("");
    const payload = { title, caption, platform, status: nextStatus, mediaAssetId: mediaAssetId || null, scheduledAt: nextStatus === "draft" ? null : isoFromLocal(scheduledAt), timezone, autoPublish: nextStatus === "scheduled" && autoPublish };
    try {
      const response = await fetch(selectedId ? `/api/calendar/${selectedId}` : "/api/calendar", { method: selectedId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const json = (await response.json()) as PostResponse;
      if (!response.ok || !json.data) throw new Error(json.error || "Plan kaydedilemedi.");
      editPost(json.data); await loadData();
      setNotice(nextStatus === "draft" ? "Taslak kaydedildi." : json.data.autoPublish ? "Otomatik yayın planlandı. Artık bu sayfayı açık tutman gerekmiyor." : "Takvime eklendi. Bu plan manuel hatırlatma olarak kaydedildi.");
      return json.data;
    } catch (err) { setError(err instanceof Error ? err.message : "Plan kaydedilemedi."); return null; }
    finally { setSaving(false); }
  }

  async function publishNow() {
    setError(""); setNotice("");
    let postId = selectedId;
    if (!postId) {
      const saved = await persist("scheduled");
      if (!saved) return;
      postId = saved.id;
    }
    setSaving(true);
    try {
      const response = await fetch(`/api/calendar/${postId}/publish`, { method: "POST" });
      const json = (await response.json()) as PostResponse;
      if (!response.ok || !json.data) throw new Error(json.error || "Paylaşım yapılamadı.");
      editPost(json.data); setNotice("Paylaşım başarıyla yayınlandı."); await loadData();
    } catch (err) { setError(err instanceof Error ? err.message : "Paylaşım yapılamadı."); await loadData(); }
    finally { setSaving(false); }
  }

  async function deletePost() {
    if (!selectedId) return; setSaving(true); setError("");
    try {
      const response = await fetch(`/api/calendar/${selectedId}`, { method: "DELETE" }); const json = (await response.json()) as { error?: string }; if (!response.ok) throw new Error(json.error || "Plan silinemedi.");
      resetForm(); setNotice("Plan silindi."); await loadData();
    } catch (err) { setError(err instanceof Error ? err.message : "Plan silinemedi."); }
    finally { setSaving(false); setConfirmDelete(false); }
  }

  async function moveScheduledPost(postId: string, date: Date) {
    const post = posts.find((item) => item.id === postId); if (!post || post.status === "published") return;
    const response = await fetch(`/api/calendar/${postId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scheduledAt: movePostToDay(post, date), status: "scheduled" }) });
    if (!response.ok) { const json = (await response.json()) as { error?: string }; setError(json.error || "Plan taşınamadı."); return; }
    setNotice("Plan yeni güne taşındı."); await loadData();
  }

  const postsByDay = useMemo(() => posts.reduce<Record<string, ScheduledPost[]>>((groups, post) => { const key = dayKey(post.scheduledAt); if (key) groups[key] = [...(groups[key] || []), post]; return groups; }, {}), [posts]);
  const titleLabel = view === "month" ? cursor.toLocaleDateString("tr-TR", { month: "long", year: "numeric" }) : view === "week" ? `${weekDays(cursor)[0].toLocaleDateString("tr-TR", { day: "2-digit", month: "short" })} - ${weekDays(cursor)[6].toLocaleDateString("tr-TR", { day: "2-digit", month: "short" })}` : cursor.toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" });
  const canAutoPublish = readiness?.backgroundReady === true;

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(350px,450px)_1fr]">
      <Card className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-300">Paylaşımı hazırla</p><h2 className="mt-2 text-xl font-black text-white">{selectedPost ? "Planı düzenle" : "Yeni paylaşım"}</h2><p className="mt-2 text-sm leading-6 text-zinc-400">İçeriği seç, zamanı belirle. Otomatik yayın açıksa zamanı geldiğinde BrandFlow gerisini kendi yapar.</p></div>
          <Button type="button" variant="secondary" onClick={() => resetForm()}>Yeni</Button>
        </div>

        {selectedPost && <div className="mt-4 flex flex-wrap items-center gap-2"><span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusClasses[selectedPost.status]}`}>{statuses.find((item) => item.value === selectedPost.status)?.label}</span><span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${selectedPost.autoPublish ? "border-violet-400/30 bg-violet-500/10 text-violet-100" : "border-white/10 bg-white/[0.03] text-zinc-400"}`}>{selectedPost.autoPublish ? "Otomatik yayın" : "Manuel hatırlatma"}</span>{selectedPost.attemptCount > 0 && <span className="text-xs text-zinc-500">Deneme: {selectedPost.attemptCount}/3</span>}</div>}

        <div className="mt-5 grid gap-4">
          <label className="block text-sm font-semibold text-zinc-200">Başlık<input value={title} onChange={(event) => setTitle(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm outline-none transition placeholder:text-zinc-600 focus:border-emerald-300" placeholder="Örn. Hafta sonu kampanyası" /></label>
          <label className="block text-sm font-semibold text-zinc-200">Paylaşım metni<textarea value={caption} onChange={(event) => setCaption(event.target.value)} rows={5} className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-zinc-600 focus:border-emerald-300" placeholder="Takipçilerin göreceği metin..." /></label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-zinc-200">Nerede paylaşılacak?<select value={platform} onChange={(event) => { setPlatform(event.target.value as CalendarPlatform); setAutoPublish(false); }} className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm font-semibold text-zinc-100 outline-none focus:border-emerald-300">{platforms.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            <label className="block text-sm font-semibold text-zinc-200">Görsel / video<select value={mediaAssetId} onChange={(event) => setMediaAssetId(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm font-semibold text-zinc-100 outline-none focus:border-emerald-300"><option value="">Medya seçme</option>{mediaItems.map((item) => <option key={item.id} value={item.id}>{item.type === "video" ? "Video" : "Görsel"} · {item.name}</option>)}</select></label>
          </div>

          <label className="block text-sm font-semibold text-zinc-200">Ne zaman?<input type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm font-semibold text-zinc-100 outline-none focus:border-emerald-300" /><span className="mt-2 block text-xs font-normal text-zinc-500">Saat dilimi otomatik: {timezone}</span></label>

          <div className={`rounded-2xl border p-4 ${canAutoPublish ? "border-violet-400/30 bg-violet-500/[.08]" : "border-white/10 bg-white/[.025]"}`}>
            <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-black text-white">Otomatik yayınla</p><p className="mt-1 text-xs leading-5 text-zinc-400">Açık olduğunda bilgisayarını ve BrandFlow&apos;u kapatsan bile seçilen saatte sunucu paylaşır.</p></div><button type="button" role="switch" aria-checked={autoPublish} disabled={!canAutoPublish || readinessLoading} onClick={() => setAutoPublish((value) => !value)} className={`relative h-7 w-12 shrink-0 rounded-full border transition ${autoPublish ? "border-violet-300 bg-violet-500" : "border-white/15 bg-zinc-800"} disabled:cursor-not-allowed disabled:opacity-40`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${autoPublish ? "left-7" : "left-1"}`} /></button></div>
            <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3 text-xs leading-5 text-zinc-300">{readinessLoading ? "Otomatik yayın kontrol ediliyor..." : readiness?.message || "Otomatik yayın durumu alınamadı."}{readiness?.connected && <span className="mt-1 block text-emerald-200">Hesap: {readiness.accountName || platformLabel(platform)} ✓</span>}{readiness && !readiness.connected && readiness.supported && <a href="/profiles" className="mt-2 inline-block font-black text-violet-200 hover:text-white">Sosyal Hesaplar&apos;a git →</a>}</div>
          </div>

          {selectedPost?.failureReason && <div className="rounded-xl border border-red-400/25 bg-red-500/10 p-3 text-sm leading-6 text-red-100"><strong>Son yayın hatası:</strong> {selectedPost.failureReason}{selectedPost.nextAttemptAt && <span className="mt-1 block text-xs text-red-200/80">Tekrar deneme: {postDateLabel(selectedPost.nextAttemptAt)}</span>}</div>}
          {error && <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm font-semibold text-red-200">{error}</div>}
          {notice && <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm font-semibold text-emerald-100">{notice}</div>}

          <div className="grid gap-2 sm:grid-cols-2"><Button type="button" variant="secondary" onClick={() => void persist("draft")} disabled={saving}>Taslak kaydet</Button><Button type="button" onClick={() => void persist("scheduled")} disabled={saving}>{saving ? "Kaydediliyor..." : autoPublish ? "Otomatik planla" : "Takvime ekle"}</Button></div>
          <Button type="button" variant="secondary" onClick={() => void publishNow()} disabled={saving || (readiness?.supported === false)}>Şimdi paylaş</Button>

          {selectedPost && (!confirmDelete ? <button type="button" onClick={() => setConfirmDelete(true)} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-bold text-zinc-500 transition hover:border-red-400/30 hover:text-red-200">Planı sil</button> : <div className="rounded-xl border border-red-400/20 bg-red-500/[.05] p-3"><p className="text-sm font-semibold text-red-100">Bu plan silinsin mi?</p><div className="mt-2 flex gap-2"><button type="button" onClick={() => void deletePost()} disabled={saving} className="rounded-lg bg-red-500 px-3 py-2 text-xs font-black text-white">Evet, sil</button><button type="button" onClick={() => setConfirmDelete(false)} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-black text-zinc-300">Vazgeç</button></div></div>)}
        </div>
      </Card>

      <div className="grid gap-5">
        <Card className="p-5"><div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"><div><p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Yayın takvimi</p><h2 className="mt-2 text-2xl font-black capitalize text-white">{titleLabel}</h2></div><div className="flex flex-wrap gap-2">{(["month", "week", "day"] as CalendarView[]).map((item) => <button key={item} type="button" onClick={() => setView(item)} className={`rounded-lg border px-3 py-2 text-sm font-black transition ${view === item ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-100" : "border-white/10 bg-white/[0.03] text-zinc-400 hover:text-white"}`}>{viewLabels[item]}</button>)}<select value={platformFilter} onChange={(event) => setPlatformFilter(event.target.value as CalendarPlatform | "all")} className="rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm font-semibold text-zinc-100 outline-none"><option value="all">Tüm platformlar</option>{platforms.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><Button type="button" variant="secondary" onClick={() => setCursor(addDays(cursor, view === "month" ? -30 : view === "week" ? -7 : -1))}>Önceki</Button><Button type="button" variant="secondary" onClick={() => setCursor(new Date())}>Bugün</Button><Button type="button" variant="secondary" onClick={() => setCursor(addDays(cursor, view === "month" ? 30 : view === "week" ? 7 : 1))}>Sonraki</Button></div></div></Card>

        {loading ? <Card className="p-5"><div className="grid gap-3 md:grid-cols-7">{Array.from({ length: view === "day" ? 1 : view === "week" ? 7 : 42 }).map((_, index) => <div key={index} className="h-32 animate-pulse rounded-lg bg-white/5" />)}</div></Card> : visibleDays.length === 0 ? <EmptyState title="Takvim boş" description="Yeni bir paylaşım oluşturup tarih seçerek takvime ekle." /> : <div className={`grid gap-3 ${view === "day" ? "grid-cols-1" : "md:grid-cols-7"}`}>{visibleDays.map((day) => { const key = dayKey(day); const dayPosts = postsByDay[key] || []; const inCurrentMonth = day.getMonth() === cursor.getMonth(); return <Card key={key} className={`min-h-36 p-3 ${view === "month" && !inCurrentMonth ? "opacity-50" : ""}`} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); let postId = event.dataTransfer.getData("text/plain"); if (postId) void moveScheduledPost(postId, day); }}><button type="button" onClick={() => resetForm(day)} className="flex w-full items-center justify-between text-left"><span className="text-sm font-black text-white">{day.toLocaleDateString("tr-TR", { day: "2-digit" })}</span><span className="text-xs text-zinc-500">{day.toLocaleDateString("tr-TR", { weekday: "short" })}</span></button><div className="mt-3 space-y-2">{dayPosts.map((post) => <button key={post.id} type="button" draggable={post.status !== "published"} onDragStart={(event) => event.dataTransfer.setData("text/plain", post.id)} onClick={() => editPost(post)} className={`w-full rounded-lg border p-2 text-left transition hover:bg-white/5 ${selectedId === post.id ? "border-emerald-400/50" : "border-white/10"}`}><span className="block truncate text-xs font-black text-white">{post.title}</span><span className="mt-1 block text-[11px] text-zinc-500">{formatTime(post.scheduledAt)} · {platformLabel(post.platform)}</span><span className="mt-2 flex flex-wrap gap-1"><span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusClasses[post.status]}`}>{statuses.find((item) => item.value === post.status)?.label}</span>{post.status === "scheduled" && <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${post.autoPublish ? "border-violet-400/30 bg-violet-500/10 text-violet-100" : "border-white/10 text-zinc-500"}`}>{post.autoPublish ? "Otomatik" : "Manuel"}</span>}</span></button>)}</div></Card>; })}</div>}

        <Card className="p-5"><div className="flex items-center justify-between"><div><h2 className="text-lg font-black text-white">Yaklaşan planlar</h2><p className="mt-1 text-sm text-zinc-500">Otomatik olanları ayrıca işaretliyoruz; neyin kendi kendine yayınlanacağını karıştırmazsın.</p></div></div><div className="mt-4 grid gap-3">{posts.filter((post) => post.status === "scheduled").slice(0, 5).length === 0 ? <p className="text-sm text-zinc-500">Yaklaşan plan yok.</p> : posts.filter((post) => post.status === "scheduled").slice(0, 5).map((post) => <button key={post.id} type="button" onClick={() => editPost(post)} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left"><span><span className="block text-sm font-black text-white">{post.title}</span><span className="mt-1 block text-xs text-zinc-500">{postDateLabel(post.scheduledAt)} · {platformLabel(post.platform)}</span></span><span className={`rounded-full border px-2.5 py-1 text-xs font-black ${post.autoPublish ? "border-violet-400/30 bg-violet-500/10 text-violet-100" : "border-white/10 text-zinc-500"}`}>{post.autoPublish ? "Otomatik" : "Manuel"}</span></button>)}</div></Card>
      </div>
    </div>
  );
}
