"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button, Card, EmptyState } from "@/components/ui";
import type { MediaAsset } from "@/lib/media/types";

type VideoStatus = "preparing" | "queued" | "processing" | "completed" | "failed";
type VideoStyle = "Cinematic" | "Funny" | "Product Promotion" | "Social Media" | "Realistic";
type VideoAspectRatio = "9:16" | "1:1" | "16:9";

type GeneratedVideo = {
  status: VideoStatus;
  jobId?: string;
  provider?: string;
  prompt?: string;
  media?: MediaAsset;
  signedUrl?: string;
  error?: string;
};

type VideoStudioResponse = {
  data?: GeneratedVideo;
  error?: string;
};

type CapabilitiesResponse = {
  data?: {
    provider: string;
    configured: boolean;
    supportedDurations: number[];
    supportedAspectRatios: VideoAspectRatio[];
    styles: VideoStyle[];
    message?: string;
  };
  error?: string;
};

type MediaResponse = {
  data?: MediaAsset[];
  error?: string;
};

const aspectRatioOptions: Array<{ value: VideoAspectRatio; label: string; helper: string }> = [
  { value: "9:16", label: "9:16", helper: "Reels, TikTok, Shorts" },
  { value: "1:1", label: "1:1", helper: "Kare sosyal post" },
  { value: "16:9", label: "16:9", helper: "YouTube ve yatay video" },
];

const fallbackStyles: VideoStyle[] = ["Cinematic", "Funny", "Product Promotion", "Social Media", "Realistic"];

const statusLabels: Record<VideoStatus, string> = {
  preparing: "preparing",
  queued: "queued",
  processing: "processing",
  completed: "completed",
  failed: "failed",
};

const statusDescriptions: Record<VideoStatus, string> = {
  preparing: "İstek hazırlanıyor.",
  queued: "Video üretim kuyruğuna alındı.",
  processing: "Video sağlayıcısı üretimi sürdürüyor.",
  completed: "Video hazır ve Medya Merkezine kaydedildi.",
  failed: "Video üretimi tamamlanamadı.",
};

function safeFilename(name: string) {
  return name.replace(/[^\w.-]+/g, "-") || "brandflow-video.mp4";
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;

  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function delay(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export function VideoStudioClient() {
  const [prompt, setPrompt] = useState("");
  const [sourceMediaId, setSourceMediaId] = useState("");
  const [aspectRatio, setAspectRatio] = useState<VideoAspectRatio>("9:16");
  const [duration, setDuration] = useState(5);
  const [style, setStyle] = useState<VideoStyle>("Social Media");
  const [mediaItems, setMediaItems] = useState<MediaAsset[]>([]);
  const [capabilities, setCapabilities] = useState<CapabilitiesResponse["data"] | null>(null);
  const [status, setStatus] = useState<VideoStatus | null>(null);
  const [result, setResult] = useState<GeneratedVideo | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [mediaAction, setMediaAction] = useState<"favorite" | "delete" | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadStudioData() {
      setLoading(true);
      setError("");

      try {
        const [capabilityResponse, mediaResponse] = await Promise.all([
          fetch("/api/video-studio/generate"),
          fetch("/api/media?sort=newest"),
        ]);
        const capabilityJson = (await capabilityResponse.json()) as CapabilitiesResponse;
        const mediaJson = (await mediaResponse.json()) as MediaResponse;

        if (!active) return;

        if (capabilityResponse.ok && capabilityJson.data) {
          setCapabilities(capabilityJson.data);

          if (capabilityJson.data.supportedDurations.length > 0) {
            setDuration((current) =>
              capabilityJson.data!.supportedDurations.includes(current)
                ? current
                : capabilityJson.data!.supportedDurations[0],
            );
          }

          if (capabilityJson.data.styles.length > 0) {
            setStyle((current) => (capabilityJson.data!.styles.includes(current) ? current : capabilityJson.data!.styles[0]));
          }
        }

        if (mediaResponse.ok && Array.isArray(mediaJson.data)) {
          setMediaItems(mediaJson.data.filter((item) => (item.type === "image" || item.type === "video") && item.storagePath));
        }
      } catch {
        if (active) {
          setError("Video Studio bilgileri yüklenemedi. Lütfen tekrar dene.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadStudioData();

    return () => {
      active = false;
    };
  }, []);

  const selectedSource = useMemo(() => {
    return mediaItems.find((item) => item.id === sourceMediaId) || null;
  }, [mediaItems, sourceMediaId]);

  const durationOptions = capabilities?.supportedDurations ?? [5, 10];
  const styleOptions = capabilities?.styles?.length ? capabilities.styles : fallbackStyles;

  async function pollVideoJob(jobId: string) {
    setStatus("processing");

    for (let attempt = 0; attempt < 90; attempt += 1) {
      await delay(attempt === 0 ? 1200 : 4000);

      const params = new URLSearchParams({ jobId });
      const response = await fetch(`/api/video-studio/generate?${params.toString()}`);
      const data = (await response.json()) as VideoStudioResponse;

      if (!response.ok || !data.data) {
        throw new Error(data.error || "Video durumu alınamadı.");
      }

      if (data.data.status === "failed") {
        throw new Error(data.data.error || "Video üretimi başarısız oldu.");
      }

      if (data.data.status === "completed") {
        if (!data.data.media || !data.data.signedUrl) {
          throw new Error("Video tamamlandı ama Medya Merkezine kaydedilemedi.");
        }

        setStatus("completed");
        setResult(data.data);
        return;
      }

      setStatus(data.data.status);
    }

    throw new Error("Video üretimi beklenenden uzun sürdü. Daha sonra tekrar kontrol et.");
  }

  async function generateVideo() {
    if (!prompt.trim()) {
      setError("Video fikrini yaz.");
      return;
    }

    setGenerating(true);
    setStatus("preparing");
    setError("");
    setResult(null);

    try {
      await delay(200);
      setStatus("queued");

      const response = await fetch("/api/video-studio/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          sourceMediaId: sourceMediaId || null,
          aspectRatio,
          duration,
          style,
        }),
      });
      const data = (await response.json()) as VideoStudioResponse;

      if (!response.ok || !data.data) {
        throw new Error(data.error || "Video üretimi başlatılamadı.");
      }

      if (data.data.status === "completed" && data.data.media && data.data.signedUrl) {
        setStatus("completed");
        setResult(data.data);
        return;
      }

      if (!data.data.jobId) {
        throw new Error("Video sağlayıcısı job ID döndürmedi.");
      }

      await pollVideoJob(data.data.jobId);
    } catch (err) {
      setStatus("failed");
      setError(err instanceof Error ? err.message : "Video üretilemedi. Lütfen tekrar dene.");
    } finally {
      setGenerating(false);
    }
  }

  async function downloadVideo() {
    if (!result?.media) return;

    setDownloading(true);

    try {
      const signedResponse = await fetch(`/api/media/${result.media.id}/signed-url`, { method: "POST" });
      const signedJson = (await signedResponse.json()) as { data?: { signedUrl?: string } };
      const signedUrl = signedJson.data?.signedUrl || result.signedUrl;

      if (!signedUrl) {
        throw new Error("Video bağlantısı bulunamadı.");
      }

      const videoResponse = await fetch(signedUrl);

      if (!videoResponse.ok) throw new Error("Video indirilemedi.");

      const blob = await videoResponse.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = safeFilename(result.media.name);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      setError("Video indirilemedi. Lütfen tekrar dene.");
    } finally {
      setDownloading(false);
    }
  }

  async function toggleFavorite() {
    if (!result?.media) return;
    setMediaAction("favorite");
    setError("");
    try {
      const response = await fetch(`/api/media/${result.media.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: !result.media.isFavorite }),
      });
      const json = (await response.json()) as { data?: MediaAsset; error?: string };
      if (!response.ok || !json.data) throw new Error(json.error || "Favori durumu güncellenemedi.");
      setResult((current) => current ? { ...current, media: json.data } : current);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Favori durumu güncellenemedi.");
    } finally {
      setMediaAction(null);
    }
  }

  async function deleteVideo() {
    if (!result?.media || !window.confirm("Bu videoyu Medya Merkezinden kalıcı olarak silmek istiyor musun?")) return;
    setMediaAction("delete");
    setError("");
    try {
      const response = await fetch(`/api/media/${result.media.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Video silinemedi.");
      setResult(null);
      setStatus(null);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Video silinemedi.");
    } finally {
      setMediaAction(null);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,480px)_1fr]">
      <Card className="p-5">
        <form
          className="grid gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            void generateVideo();
          }}
        >
          {capabilities?.message && (
            <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-sm font-semibold leading-6 text-amber-100">
              {capabilities.message}
            </div>
          )}

          <label className="block text-sm font-semibold text-zinc-200" htmlFor="videoPrompt">
            Video fikri
            <textarea
              id="videoPrompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={7}
              placeholder="Örneğin: Yeni kahve markası için sabah enerjisini anlatan hızlı, sıcak ve dinamik dikey video"
              className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-zinc-600 focus:border-emerald-300"
            />
          </label>

          <label className="block text-sm font-semibold text-zinc-200" htmlFor="sourceMedia">
            Kaynak medya
            <select
              id="sourceMedia"
              value={sourceMediaId}
              onChange={(event) => setSourceMediaId(event.target.value)}
              className="mt-2 w-full rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-sm font-semibold text-zinc-100 outline-none transition focus:border-emerald-300"
            >
              <option value="">Kaynak kullanma</option>
              {mediaItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.type === "video" ? "Video" : "Görsel"} - {item.name}
                </option>
              ))}
            </select>
          </label>

          {selectedSource && (
            <div className="rounded-lg border border-white/10 bg-zinc-950/70 p-3 text-sm leading-6 text-zinc-300">
              <span className="font-black text-white">{selectedSource.name}</span>
              <span className="ml-2 text-zinc-500">
                {selectedSource.type === "video" ? "Video" : "Görsel"} · {formatBytes(selectedSource.size)}
              </span>
            </div>
          )}

          <div>
            <p className="text-sm font-semibold text-zinc-200">Oran</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {aspectRatioOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setAspectRatio(option.value)}
                  className={`rounded-lg border p-3 text-left transition ${
                    aspectRatio === option.value
                      ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-100"
                      : "border-white/10 bg-white/[0.03] text-zinc-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span className="block text-sm font-black">{option.label}</span>
                  <span className="mt-1 block text-xs">{option.helper}</span>
                </button>
              ))}
            </div>
          </div>

          <label className="block text-sm font-semibold text-zinc-200" htmlFor="videoStyle">
            Stil
            <select
              id="videoStyle"
              value={style}
              onChange={(event) => setStyle(event.target.value as VideoStyle)}
              className="mt-2 w-full rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-sm font-semibold text-zinc-100 outline-none transition focus:border-emerald-300"
            >
              {styleOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          {durationOptions.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-zinc-200">Süre</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {durationOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setDuration(option)}
                    className={`rounded-lg border px-3 py-3 text-sm font-black transition ${
                      duration === option
                        ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-100"
                        : "border-white/10 bg-white/[0.03] text-zinc-400 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {option} sn
                  </button>
                ))}
              </div>
            </div>
          )}

          {status && (
            <div className="rounded-lg border border-white/10 bg-zinc-950/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs uppercase tracking-[0.16em] text-zinc-500">Durum</span>
                <span
                  className={`rounded-full border px-2.5 py-1 text-xs font-bold ${
                    status === "completed"
                      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                      : status === "failed"
                        ? "border-red-400/30 bg-red-500/10 text-red-200"
                        : "border-white/10 bg-white/5 text-zinc-300"
                  }`}
                >
                  {statusLabels[status]}
                </span>
              </div>
              <p className="mt-2 text-sm text-zinc-400">{statusDescriptions[status]}</p>
              {generating && status !== "failed" && (
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-800">
                  <div className="h-full w-2/3 animate-pulse rounded-full bg-emerald-400" />
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm font-semibold leading-6 text-red-200">
              {error}
            </div>
          )}

          <Button type="submit" disabled={loading || generating} className="py-4 text-base font-black">
            {generating && <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-950/30 border-t-zinc-950" />}
            {generating ? "Video hazırlanıyor" : "Video Oluştur"}
          </Button>
        </form>
      </Card>

      <div>
        {loading ? (
          <Card className="p-5">
            <div className="aspect-video w-full animate-pulse rounded-lg bg-white/5" />
            <div className="mt-5 space-y-3">
              <div className="h-4 w-2/3 animate-pulse rounded bg-white/10" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-white/10" />
            </div>
          </Card>
        ) : generating && !result ? (
          <Card className="p-5">
            <div className="grid aspect-video w-full place-items-center rounded-lg border border-white/10 bg-zinc-950">
              <div className="text-center">
                <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-emerald-400/30 border-t-emerald-300" />
                <p className="mt-4 text-sm font-black text-white">{status ? statusDescriptions[status] : "Video hazırlanıyor."}</p>
                <p className="mt-2 text-xs text-zinc-500">Gerçek sağlayıcı sonucu dönene kadar bekleniyor.</p>
              </div>
            </div>
          </Card>
        ) : result?.media && result.signedUrl ? (
          <Card className="overflow-hidden">
            <div className="bg-zinc-950">
              <video src={result.signedUrl} controls playsInline className="max-h-[720px] w-full bg-black object-contain" />
            </div>
            <div className="p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Medya Merkezine kaydedildi</p>
                  <h2 className="mt-2 text-xl font-black text-white">{result.media.name}</h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">{result.prompt || prompt}</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                  <Button type="button" onClick={downloadVideo} disabled={downloading}>
                    {downloading ? "İndiriliyor" : "İndir"}
                  </Button>
                  <Button type="button" variant="secondary" disabled={Boolean(mediaAction)} onClick={() => void toggleFavorite()}>
                    {mediaAction === "favorite" ? "Kaydediliyor" : result.media.isFavorite ? "Favoriden Çıkar" : "Favoriye Ekle"}
                  </Button>
                  <Button type="button" variant="secondary" disabled={Boolean(mediaAction)} onClick={() => void deleteVideo()}>
                    {mediaAction === "delete" ? "Siliniyor" : "Sil"}
                  </Button>
                  <Link href="/media">
                    <Button type="button" variant="secondary" className="w-full">
                      Medya Merkezinde Aç
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </Card>
        ) : (
          <EmptyState
            title="Henüz video yok"
            description="Video fikrini yazıp gerçek sağlayıcı ile üretim başlattığında sonuç burada görünecek ve Medya Merkezine kaydedilecek."
          />
        )}
      </div>
    </div>
  );
}
