"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Card, EmptyState } from "@/components/ui";
import type { CalendarPlatform, CalendarStatus, ScheduledPost } from "@/lib/calendar/types";
import type { MediaAsset } from "@/lib/media/types";

type CalendarView = "month" | "week" | "day";

type CalendarResponse = {
  data?: ScheduledPost[];
  error?: string;
};

type PostResponse = {
  data?: ScheduledPost;
  error?: string;
};

type MediaResponse = {
  data?: MediaAsset[];
  error?: string;
};

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

const viewLabels: Record<CalendarView, string> = {
  month: "Month",
  week: "Week",
  day: "Day",
};

const statusClasses: Record<CalendarStatus, string> = {
  draft: "border-zinc-500/30 bg-zinc-500/10 text-zinc-200",
  scheduled: "border-sky-400/30 bg-sky-400/10 text-sky-100",
  published: "border-emerald-400/30 bg-emerald-400/10 text-emerald-100",
  failed: "border-red-400/30 bg-red-500/10 text-red-100",
};

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfWeek(date: Date) {
  const next = startOfDay(date);
  const day = (next.getDay() + 6) % 7;
  return addDays(next, -day);
}

function monthDays(date: Date) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const start = startOfWeek(first);
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

function weekDays(date: Date) {
  const start = startOfWeek(date);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

function dayKey(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function datetimeLocal(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${dayKey(date)}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function isoFromLocal(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function movePostToDay(post: ScheduledPost, date: Date) {
  const current = post.scheduledAt ? new Date(post.scheduledAt) : new Date();
  const next = new Date(date);
  next.setHours(current.getHours(), current.getMinutes(), 0, 0);
  return next.toISOString();
}

function formatTime(value: string | null | undefined) {
  if (!value) return "Saat yok";
  return new Date(value).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

function rangeForView(view: CalendarView, cursor: Date) {
  if (view === "day") {
    return { from: startOfDay(cursor), to: addDays(startOfDay(cursor), 1) };
  }

  if (view === "week") {
    const from = startOfWeek(cursor);
    return { from, to: addDays(from, 7) };
  }

  const days = monthDays(cursor);
  return { from: days[0], to: addDays(days[days.length - 1], 1) };
}

function postDateLabel(value: string | null | undefined) {
  if (!value) return "Taslak";
  return new Date(value).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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
  const [status, setStatus] = useState<CalendarStatus>("scheduled");
  const [mediaAssetId, setMediaAssetId] = useState("");
  const [scheduledAt, setScheduledAt] = useState(() => datetimeLocal(new Date().toISOString()));
  const [timezone, setTimezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const visibleDays = useMemo(() => {
    if (view === "day") return [startOfDay(cursor)];
    if (view === "week") return weekDays(cursor);
    return monthDays(cursor);
  }, [cursor, view]);

  const selectedPost = posts.find((post) => post.id === selectedId) || null;

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const range = rangeForView(view, cursor);
      const params = new URLSearchParams({
        from: range.from.toISOString(),
        to: range.to.toISOString(),
        platform: platformFilter,
      });
      const [calendarResponse, mediaResponse] = await Promise.all([
        fetch(`/api/calendar?${params.toString()}`),
        fetch("/api/media?sort=newest"),
      ]);
      const calendarJson = (await calendarResponse.json()) as CalendarResponse;
      const mediaJson = (await mediaResponse.json()) as MediaResponse;

      if (!calendarResponse.ok || !calendarJson.data) {
        throw new Error(calendarJson.error || "Takvim yüklenemedi.");
      }

      setPosts(calendarJson.data);

      if (mediaResponse.ok && mediaJson.data) {
        setMediaItems(mediaJson.data.filter((item) => item.type === "image" || item.type === "video"));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Takvim yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, cursor, platformFilter]);

  function resetForm(date?: Date) {
    setSelectedId("");
    setTitle("");
    setCaption("");
    setPlatform(platformFilter === "all" ? "instagram" : platformFilter);
    setStatus("scheduled");
    setMediaAssetId("");
    setScheduledAt(datetimeLocal((date || new Date()).toISOString()));
  }

  function editPost(post: ScheduledPost) {
    setSelectedId(post.id);
    setTitle(post.title);
    setCaption(post.caption);
    setPlatform(post.platform);
    setStatus(post.status);
    setMediaAssetId(post.mediaAssetId || "");
    setScheduledAt(datetimeLocal(post.scheduledAt || new Date().toISOString()));
    setTimezone(post.timezone || timezone);
  }

  async function savePost() {
    if (!title.trim()) {
      setError("Başlık yazmalısın.");
      return;
    }

    if (status === "scheduled" && !scheduledAt) {
      setError("Planlanan saat seçmelisin.");
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    const payload = {
      title,
      caption,
      platform,
      status,
      mediaAssetId: mediaAssetId || null,
      scheduledAt: status === "draft" ? null : isoFromLocal(scheduledAt),
      timezone,
    };

    try {
      const response = await fetch(selectedId ? `/api/calendar/${selectedId}` : "/api/calendar", {
        method: selectedId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await response.json()) as PostResponse;

      if (!response.ok || !json.data) {
        throw new Error(json.error || "Plan kaydedilemedi.");
      }

      setNotice(selectedId ? "Plan güncellendi." : "Plan oluşturuldu.");
      editPost(json.data);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Plan kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

  async function deletePost() {
    if (!selectedId) return;

    setSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/calendar/${selectedId}`, { method: "DELETE" });
      const json = (await response.json()) as { error?: string };

      if (!response.ok) throw new Error(json.error || "Plan silinemedi.");

      setNotice("Plan silindi.");
      resetForm();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Plan silinemedi.");
    } finally {
      setSaving(false);
    }
  }

  async function publishNow() {
    if (!selectedId) return;

    setSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/calendar/${selectedId}/publish`, { method: "POST" });
      const json = (await response.json()) as PostResponse;

      if (!response.ok || !json.data) {
        throw new Error(json.error || "Paylaşım yapılamadı.");
      }

      setNotice("Paylaşım tamamlandı.");
      editPost(json.data);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Paylaşım yapılamadı.");
      await loadData();
    } finally {
      setSaving(false);
    }
  }

  async function moveScheduledPost(postId: string, date: Date) {
    const post = posts.find((item) => item.id === postId);
    if (!post) return;

    const nextDate = movePostToDay(post, date);
    const response = await fetch(`/api/calendar/${postId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduledAt: nextDate, status: post.status === "draft" ? "scheduled" : post.status }),
    });

    if (!response.ok) {
      const json = (await response.json()) as { error?: string };
      setError(json.error || "Plan taşınamadı.");
      return;
    }

    await loadData();
  }

  const postsByDay = useMemo(() => {
    return posts.reduce<Record<string, ScheduledPost[]>>((groups, post) => {
      const key = dayKey(post.scheduledAt);
      if (!key) return groups;
      groups[key] = [...(groups[key] || []), post];
      return groups;
    }, {});
  }, [posts]);

  const titleLabel =
    view === "month"
      ? cursor.toLocaleDateString("tr-TR", { month: "long", year: "numeric" })
      : view === "week"
        ? `${weekDays(cursor)[0].toLocaleDateString("tr-TR", { day: "2-digit", month: "short" })} - ${weekDays(cursor)[6].toLocaleDateString("tr-TR", { day: "2-digit", month: "short" })}`
        : cursor.toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(340px,430px)_1fr]">
      <Card className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Plan oluştur</p>
            <h2 className="mt-2 text-xl font-black text-white">{selectedPost ? "Planı düzenle" : "Yeni paylaşım"}</h2>
          </div>
          <Button type="button" variant="secondary" onClick={() => resetForm()}>
            Yeni
          </Button>
        </div>

        <div className="mt-5 grid gap-4">
          <label className="block text-sm font-semibold text-zinc-200">
            Başlık
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="mt-2 w-full rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-sm outline-none transition placeholder:text-zinc-600 focus:border-emerald-300"
              placeholder="Hafta sonu kampanya duyurusu"
            />
          </label>

          <label className="block text-sm font-semibold text-zinc-200">
            Metin
            <textarea
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              rows={5}
              className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-zinc-600 focus:border-emerald-300"
              placeholder="Paylaşım metnini yaz..."
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-zinc-200">
              Platform
              <select value={platform} onChange={(event) => setPlatform(event.target.value as CalendarPlatform)} className="mt-2 w-full rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-sm font-semibold text-zinc-100 outline-none focus:border-emerald-300">
                {platforms.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-semibold text-zinc-200">
              Durum
              <select value={status} onChange={(event) => setStatus(event.target.value as CalendarStatus)} className="mt-2 w-full rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-sm font-semibold text-zinc-100 outline-none focus:border-emerald-300">
                {statuses.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block text-sm font-semibold text-zinc-200">
            Medya
            <select value={mediaAssetId} onChange={(event) => setMediaAssetId(event.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-sm font-semibold text-zinc-100 outline-none focus:border-emerald-300">
              <option value="">Medya seçme</option>
              {mediaItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.type === "video" ? "Video" : "Görsel"} - {item.name}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-zinc-200">
              Zaman
              <input type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-sm font-semibold text-zinc-100 outline-none focus:border-emerald-300" />
            </label>
            <label className="block text-sm font-semibold text-zinc-200">
              Zaman dilimi
              <input value={timezone} onChange={(event) => setTimezone(event.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-sm font-semibold text-zinc-100 outline-none focus:border-emerald-300" />
            </label>
          </div>

          {error && <div className="rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm font-semibold text-red-200">{error}</div>}
          {notice && <div className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm font-semibold text-emerald-100">{notice}</div>}

          <div className="grid gap-2 sm:grid-cols-2">
            <Button type="button" onClick={savePost} disabled={saving}>
              {saving ? "Kaydediliyor" : selectedPost ? "Güncelle" : "Planla"}
            </Button>
            <Button type="button" variant="secondary" onClick={publishNow} disabled={!selectedPost || saving}>
              Şimdi paylaş
            </Button>
          </div>

          {selectedPost && (
            <Button type="button" variant="secondary" onClick={deletePost} disabled={saving}>
              Planı sil
            </Button>
          )}
        </div>
      </Card>

      <div className="grid gap-5">
        <Card className="p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Takvim</p>
              <h2 className="mt-2 text-2xl font-black capitalize text-white">{titleLabel}</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {(["month", "week", "day"] as CalendarView[]).map((item) => (
                <button key={item} type="button" onClick={() => setView(item)} className={`rounded-lg border px-3 py-2 text-sm font-black transition ${view === item ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-100" : "border-white/10 bg-white/[0.03] text-zinc-400 hover:text-white"}`}>
                  {viewLabels[item]}
                </button>
              ))}
              <select value={platformFilter} onChange={(event) => setPlatformFilter(event.target.value as CalendarPlatform | "all")} className="rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm font-semibold text-zinc-100 outline-none">
                <option value="all">Tüm platformlar</option>
                {platforms.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              <Button type="button" variant="secondary" onClick={() => setCursor(addDays(cursor, view === "month" ? -30 : view === "week" ? -7 : -1))}>
                Önceki
              </Button>
              <Button type="button" variant="secondary" onClick={() => setCursor(new Date())}>
                Bugün
              </Button>
              <Button type="button" variant="secondary" onClick={() => setCursor(addDays(cursor, view === "month" ? 30 : view === "week" ? 7 : 1))}>
                Sonraki
              </Button>
            </div>
          </div>
        </Card>

        {loading ? (
          <Card className="p-5">
            <div className="grid gap-3 md:grid-cols-7">
              {Array.from({ length: view === "day" ? 1 : view === "week" ? 7 : 42 }).map((_, index) => (
                <div key={index} className="h-32 animate-pulse rounded-lg bg-white/5" />
              ))}
            </div>
          </Card>
        ) : visibleDays.length === 0 ? (
          <EmptyState title="Takvim boş" description="Medya Merkezinden bir görsel veya video seçip paylaşım planı oluştur." />
        ) : (
          <div className={`grid gap-3 ${view === "day" ? "grid-cols-1" : "md:grid-cols-7"}`}>
            {visibleDays.map((day) => {
              const key = dayKey(day);
              const dayPosts = postsByDay[key] || [];
              const inCurrentMonth = day.getMonth() === cursor.getMonth();

              return (
                <Card
                  key={key}
                  className={`min-h-36 p-3 ${view === "month" && !inCurrentMonth ? "opacity-50" : ""}`}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    const postId = event.dataTransfer.getData("text/plain");
                    if (postId) void moveScheduledPost(postId, day);
                  }}
                >
                  <button type="button" onClick={() => resetForm(day)} className="flex w-full items-center justify-between text-left">
                    <span className="text-sm font-black text-white">{day.toLocaleDateString("tr-TR", { day: "2-digit" })}</span>
                    <span className="text-xs text-zinc-500">{day.toLocaleDateString("tr-TR", { weekday: "short" })}</span>
                  </button>
                  <div className="mt-3 space-y-2">
                    {dayPosts.map((post) => (
                      <button
                        key={post.id}
                        type="button"
                        draggable
                        onDragStart={(event) => event.dataTransfer.setData("text/plain", post.id)}
                        onClick={() => editPost(post)}
                        className={`w-full rounded-lg border p-2 text-left transition hover:bg-white/5 ${selectedId === post.id ? "border-emerald-400/50" : "border-white/10"}`}
                      >
                        <span className="block truncate text-xs font-black text-white">{post.title}</span>
                        <span className="mt-1 block text-[11px] text-zinc-500">
                          {formatTime(post.scheduledAt)} · {platforms.find((item) => item.value === post.platform)?.label}
                        </span>
                        <span className={`mt-2 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusClasses[post.status]}`}>
                          {statuses.find((item) => item.value === post.status)?.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        <Card className="p-5">
          <h2 className="text-lg font-black text-white">Yaklaşan planlar</h2>
          <div className="mt-4 grid gap-3">
            {posts.filter((post) => post.status === "scheduled").slice(0, 5).length === 0 ? (
              <p className="text-sm text-zinc-500">Yaklaşan plan yok.</p>
            ) : (
              posts
                .filter((post) => post.status === "scheduled")
                .slice(0, 5)
                .map((post) => (
                  <button key={post.id} type="button" onClick={() => editPost(post)} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-left">
                    <span>
                      <span className="block text-sm font-black text-white">{post.title}</span>
                      <span className="mt-1 block text-xs text-zinc-500">{postDateLabel(post.scheduledAt)}</span>
                    </span>
                    <span className="text-xs font-bold text-emerald-200">{platforms.find((item) => item.value === post.platform)?.label}</span>
                  </button>
                ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
