"use client";

import type { DragEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, EmptyState, Modal, SearchInput } from "@/components/ui";
import type { MediaAsset, MediaAssetType } from "@/lib/media/types";

type MediaResponse = {
  data?: MediaAsset[];
  error?: string;
};

type UploadResponse = {
  data?: {
    media: MediaAsset;
    storagePath: string;
    upload: {
      signedUrl: string;
      path: string;
      token?: string;
    };
  };
  error?: string;
};

type SortOption = "newest" | "oldest" | "largest" | "smallest";
type FilterOption = "all" | MediaAssetType;
type UploadStatus = "ready" | "invalid" | "preparing" | "uploading" | "verifying" | "success" | "error";
type UploadQueueItem = {
  id: string;
  file: File;
  type: MediaAssetType;
  status: UploadStatus;
  progress: number;
  error: string;
  previewUrl: string | null;
  mediaId: string | null;
};

type PreviewState = {
  item: MediaAsset;
  signedUrl: string;
};

const filterOptions: Array<{ value: FilterOption; label: string }> = [
  { value: "all", label: "Tümü" },
  { value: "image", label: "Görseller" },
  { value: "video", label: "Videolar" },
  { value: "logo", label: "Logolar" },
];

const sortOptions: Array<{ value: SortOption; label: string }> = [
  { value: "newest", label: "En yeni" },
  { value: "oldest", label: "En eski" },
  { value: "largest", label: "En büyük" },
  { value: "smallest", label: "En küçük" },
];

const typeLabels: Record<MediaAssetType, string> = {
  image: "Görsel",
  video: "Video",
  logo: "Logo",
};

const typeShortLabels: Record<MediaAssetType, string> = {
  image: "IMG",
  video: "VID",
  logo: "LOGO",
};

const supportedImageMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const supportedVideoMimeTypes = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const imageLimit = 8 * 1024 * 1024;
const videoLimit = 100 * 1024 * 1024;

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;

  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("tr-TR");
}

function mediaQuery(filter: FilterOption, search: string, sort: SortOption) {
  const params = new URLSearchParams({ sort });

  if (filter !== "all") params.set("type", filter);
  if (search.trim()) params.set("search", search.trim());

  return params.toString();
}

function inferMediaType(file: File): MediaAssetType {
  if (supportedVideoMimeTypes.has(file.type)) return "video";
  return "image";
}

function isPreviewableMedia(item: MediaAsset) {
  return Boolean(item.storagePath && (item.type === "image" || item.type === "video" || item.type === "logo"));
}

function validateUploadFile(file: File, type: MediaAssetType) {
  const imageLike = type === "image" || type === "logo";

  if (imageLike && !supportedImageMimeTypes.has(file.type)) {
    return "Görsel ve logo için JPG, PNG veya WEBP dosyası seç.";
  }

  if (type === "video" && !supportedVideoMimeTypes.has(file.type)) {
    return "Video için MP4, WEBM veya MOV dosyası seç.";
  }

  const limit = type === "video" ? videoLimit : imageLimit;

  if (file.size > limit) {
    return `${type === "video" ? "Video" : "Görsel"} dosyası en fazla ${formatBytes(limit)} olabilir.`;
  }

  if (file.size <= 0) {
    return "Dosya boş görünüyor. Farklı bir dosya seç.";
  }

  return "";
}

function statusLabel(status: UploadStatus) {
  if (status === "ready") return "Hazır";
  if (status === "invalid") return "Geçersiz";
  if (status === "preparing") return "Hazırlanıyor";
  if (status === "uploading") return "Yükleniyor";
  if (status === "verifying") return "Doğrulanıyor";
  if (status === "success") return "Başarılı";
  return "Başarısız";
}

function uploadWithProgress(file: File, signedUrl: string, onProgress: (progress: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();

    request.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      onProgress(Math.min(95, Math.round((event.loaded / event.total) * 95)));
    };
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        onProgress(100);
        resolve();
      } else {
        reject(new Error("Medya yüklenemedi."));
      }
    };
    request.onerror = () => reject(new Error("Medya yüklenemedi."));
    request.onabort = () => reject(new Error("Medya yüklenemedi."));
    request.open("PUT", signedUrl);
    request.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    request.send(file);
  });
}

function MediaSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <Card key={index} className="overflow-hidden">
          <div className="h-40 animate-pulse bg-white/5" />
          <div className="space-y-3 p-4">
            <div className="h-4 w-3/4 animate-pulse rounded bg-white/10" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-white/10" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-white/10" />
          </div>
        </Card>
      ))}
    </div>
  );
}

function MediaTile({
  item,
  onOpen,
  onRename,
  onDelete,
}: {
  item: MediaAsset;
  onOpen: (item: MediaAsset) => void;
  onRename: (item: MediaAsset) => void;
  onDelete: (item: MediaAsset) => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState(false);

  useEffect(() => {
    let active = true;
    const previewable = Boolean(item.storagePath && (item.type === "image" || item.type === "video" || item.type === "logo"));

    async function loadPreview() {
      if (!previewable) {
        setPreviewUrl(null);
        setPreviewError(false);
        return;
      }

      try {
        const response = await fetch(`/api/media/${item.id}/signed-url`, { method: "POST" });
        const json = (await response.json()) as { data?: { signedUrl?: string } };

        if (!response.ok || !json.data?.signedUrl || !active) return;

        setPreviewUrl(json.data.signedUrl);
        setPreviewError(false);
      } catch {
        if (active) setPreviewError(true);
      }
    }

    void loadPreview();

    return () => {
      active = false;
    };
  }, [item.id, item.storagePath, item.type]);

  return (
    <Card
      className={`overflow-hidden ${isPreviewableMedia(item) ? "cursor-pointer" : ""}`}
      onClick={() => {
        if (isPreviewableMedia(item)) onOpen(item);
      }}
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          if (isPreviewableMedia(item)) onOpen(item);
        }}
        className="grid h-40 w-full place-items-center overflow-hidden border-b border-white/10 bg-zinc-950/70 text-left transition hover:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-300/60"
        aria-label={`${item.name} önizlemesini aç`}
      >
        {previewUrl && item.type === "video" ? (
          <video src={previewUrl} muted playsInline preload="metadata" className="h-full w-full object-cover" />
        ) : previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt={item.name} className="h-full w-full object-cover" />
        ) : previewError ? (
          <div className="px-4 text-center text-sm font-semibold text-zinc-400">Önizleme yüklenemedi.</div>
        ) : (
          <div className="grid h-16 min-w-16 place-items-center rounded-lg border border-white/10 bg-white/[0.03] px-4 text-sm font-black text-emerald-200">
            {typeShortLabels[item.type]}
          </div>
        )}
      </button>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 truncate text-sm font-black text-white" title={item.name}>
            {item.name}
          </h3>
          <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-bold text-zinc-300">
            {typeLabels[item.type]}
          </span>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
          <div>
            <dt className="text-zinc-500">Boyut</dt>
            <dd className="mt-1 font-semibold text-zinc-200">{formatBytes(item.size)}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Tarih</dt>
            <dd className="mt-1 font-semibold text-zinc-200">{formatDate(item.createdAt)}</dd>
          </div>
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onRename(item);
            }}
            className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-xs font-bold text-emerald-100 transition hover:bg-emerald-400/20"
          >
            Yeniden adlandır
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onDelete(item);
            }}
            className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-100 transition hover:bg-red-500/20"
          >
            Sil
          </button>
        </div>
      </div>
    </Card>
  );
}

export function MediaCenterClient() {
  const [items, setItems] = useState<MediaAsset[]>([]);
  const [allItems, setAllItems] = useState<MediaAsset[]>([]);
  const [filter, setFilter] = useState<FilterOption>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const [imageUploadType, setImageUploadType] = useState<"image" | "logo">("image");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const queueRef = useRef<UploadQueueItem[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      async function loadMedia() {
        setLoading(true);
        setError("");

        try {
          const [statsResponse, listResponse] = await Promise.all([
            fetch("/api/media?sort=newest", { signal: controller.signal }),
            fetch(`/api/media?${mediaQuery(filter, search, sort)}`, { signal: controller.signal }),
          ]);

          if (!statsResponse.ok || !listResponse.ok) {
            throw new Error("Medya listesi alınamadı.");
          }

          const statsJson = (await statsResponse.json()) as MediaResponse;
          const listJson = (await listResponse.json()) as MediaResponse;

          if (!Array.isArray(statsJson.data) || !Array.isArray(listJson.data)) {
            throw new Error("Medya listesi alınamadı.");
          }

          setAllItems(statsJson.data);
          setItems(listJson.data);
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") return;
          setAllItems([]);
          setItems([]);
          setError("Medya listesi şu anda görüntülenemiyor. Lütfen daha sonra tekrar dene.");
        } finally {
          setLoading(false);
        }
      }

      loadMedia();
    }, 180);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [filter, refreshKey, search, sort]);

  const stats = useMemo(() => {
    return {
      total: allItems.length,
      images: allItems.filter((item) => item.type === "image").length,
      videos: allItems.filter((item) => item.type === "video").length,
      logos: allItems.filter((item) => item.type === "logo").length,
      usedSpace: allItems.reduce((total, item) => total + item.size, 0),
    };
  }, [allItems]);
  const readyCount = queue.filter((item) => item.status === "ready" || item.status === "error").length;

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    return () => {
      queueRef.current.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
    };
  }, []);

  function updateQueueItem(id: string, patch: Partial<UploadQueueItem>) {
    setQueue((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function addFiles(files: FileList | File[]) {
    const nextItems = Array.from(files).map((file) => {
      const inferredType = inferMediaType(file);
      const type = inferredType === "video" ? "video" : imageUploadType;
      const errorMessage = validateUploadFile(file, type);
      const previewUrl = URL.createObjectURL(file);

      return {
        id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
        file,
        type,
        status: errorMessage ? "invalid" : "ready",
        progress: 0,
        error: errorMessage,
        previewUrl,
        mediaId: null,
      } satisfies UploadQueueItem;
    });

    setUploadSuccess("");
    setQueue((current) => [...current, ...nextItems]);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    addFiles(event.dataTransfer.files);
  }

  function clearQueue() {
    queue.forEach((item) => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });
    setQueue([]);
    setUploadSuccess("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function verifyMediaRecord(mediaId: string) {
    const response = await fetch(`/api/media/${mediaId}`);
    const json = (await response.json()) as { data?: MediaAsset };

    if (!response.ok || json.data?.id !== mediaId) {
      throw new Error("Medya doğrulanamadı.");
    }

    return json.data;
  }

  async function uploadQueueItem(item: UploadQueueItem) {
    let mediaId = "";

    try {
      updateQueueItem(item.id, { status: "preparing", progress: 5, error: "" });

      const uploadResponse = await fetch("/api/media/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: item.file.name,
          mimeType: item.file.type,
          size: item.file.size,
          type: item.type,
        }),
      });
      const uploadJson = (await uploadResponse.json()) as UploadResponse;

      if (!uploadResponse.ok || !uploadJson.data) {
        throw new Error("Yükleme hazırlanamadı.");
      }

      mediaId = uploadJson.data.media.id;
      updateQueueItem(item.id, { mediaId, status: "uploading", progress: 8 });

      await uploadWithProgress(item.file, uploadJson.data.upload.signedUrl, (progress) => {
        updateQueueItem(item.id, { progress, status: "uploading" });
      });

      updateQueueItem(item.id, { status: "verifying", progress: 98 });
      await verifyMediaRecord(mediaId);
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      updateQueueItem(item.id, { status: "success", progress: 100, mediaId, previewUrl: null });
      return true;
    } catch {
      if (mediaId) {
        await fetch(`/api/media/${mediaId}`, { method: "DELETE" }).catch(() => undefined);
      }

      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      updateQueueItem(item.id, {
        status: "error",
        progress: 0,
        error: "Yükleme başarısız oldu. Bucket ve bağlantı ayarlarını kontrol et.",
        mediaId: null,
        previewUrl: null,
      });
      return false;
    }
  }

  async function uploadQueuedFiles() {
    if (uploading) return;

    const uploadableItems = queue.filter((item) => item.status === "ready" || item.status === "error");
    if (uploadableItems.length === 0) return;

    setUploading(true);
    setUploadSuccess("");

    let successCount = 0;

    for (const item of uploadableItems) {
      const stillQueued = queueRef.current.find((queuedItem) => queuedItem.id === item.id);
      if (!stillQueued || stillQueued.status === "invalid") continue;

      const uploaded = await uploadQueueItem(stillQueued);
      if (uploaded) successCount += 1;
    }

    setUploading(false);
    setRefreshKey((value) => value + 1);

    if (successCount > 0) {
      setUploadSuccess(`${successCount} dosya yüklendi.`);
      window.setTimeout(() => setUploadSuccess(""), 2400);
    }
  }

  async function renameMedia(item: MediaAsset) {
    const nextName = window.prompt("Yeni medya adı", item.name);
    if (!nextName) return;

    const trimmedName = nextName.trim();
    if (!trimmedName || trimmedName === item.name) return;

    try {
      const response = await fetch(`/api/media/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName }),
      });

      const json = (await response.json()) as { data?: MediaAsset; error?: string };

      if (!response.ok || !json.data) {
        throw new Error(json.error ?? "Medya adlandırılamadı.");
      }

      setItems((current) => current.map((currentItem) => (currentItem.id === item.id ? json.data! : currentItem)));
      setAllItems((current) => current.map((currentItem) => (currentItem.id === item.id ? json.data! : currentItem)));
      setUploadSuccess("Medya yeniden adlandırıldı.");
      window.setTimeout(() => setUploadSuccess(""), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Medya adlandırılamadı.");
    }
  }

  async function deleteMediaItem(item: MediaAsset) {
    const confirmed = window.confirm(`${item.name} silinsin mi?`);
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/media/${item.id}`, { method: "DELETE" });

      if (!response.ok) {
        const json = (await response.json().catch(() => undefined)) as { error?: string } | undefined;
        throw new Error(json?.error ?? "Medya silinemedi.");
      }

      setItems((current) => current.filter((currentItem) => currentItem.id !== item.id));
      setAllItems((current) => current.filter((currentItem) => currentItem.id !== item.id));
      setRefreshKey((value) => value + 1);
      setUploadSuccess("Medya silindi.");
      window.setTimeout(() => setUploadSuccess(""), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Medya silinemedi.");
    }
  }

  async function openMediaPreview(item: MediaAsset) {
    if (!isPreviewableMedia(item)) return;

    setPreview(null);
    setPreviewError("");
    setPreviewLoading(true);

    try {
      const response = await fetch(`/api/media/${item.id}/signed-url`, { method: "POST" });
      const json = (await response.json()) as { data?: { signedUrl?: string }; error?: string };

      if (!response.ok || !json.data?.signedUrl) {
        throw new Error(json.error || "Önizleme bağlantısı oluşturulamadı.");
      }

      setPreview({
        item,
        signedUrl: json.data.signedUrl,
      });
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : "Önizleme bağlantısı oluşturulamadı.");
    } finally {
      setPreviewLoading(false);
    }
  }

  function closeMediaPreview() {
    setPreview(null);
    setPreviewError("");
    setPreviewLoading(false);
  }

  return (
    <div className="space-y-5">
      <Modal title={preview?.item.name || "Medya önizleme"} open={Boolean(preview) || previewLoading || Boolean(previewError)} onClose={closeMediaPreview}>
        {previewLoading ? (
          <div className="grid min-h-72 place-items-center rounded-lg border border-white/10 bg-zinc-950/70">
            <div className="text-center">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-emerald-400/30 border-t-emerald-300" />
              <p className="mt-4 text-sm font-semibold text-zinc-300">Önizleme hazırlanıyor.</p>
            </div>
          </div>
        ) : previewError ? (
          <div className="rounded-lg border border-red-400/30 bg-red-500/10 p-4 text-sm font-semibold leading-6 text-red-200">
            {previewError}
          </div>
        ) : preview?.item.type === "video" ? (
          <video src={preview.signedUrl} controls playsInline className="max-h-[70vh] w-full rounded-lg bg-black object-contain" />
        ) : preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview.signedUrl} alt={preview.item.name} className="max-h-[70vh] w-full rounded-lg bg-zinc-950 object-contain" />
        ) : null}
      </Modal>

      <Card className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-lg font-black text-white">Medya yükle</h2>
              {uploading && (
                <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-xs font-bold text-emerald-200">
                  Yükleme devam ediyor
                </span>
              )}
            </div>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              JPG, PNG, WEBP, MP4, WEBM veya MOV dosyası seç. Görsel ve logo en fazla 8 MB, video en fazla 100 MB olabilir.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="block text-sm font-semibold text-zinc-200">
              Görselleri kaydet
              <select
                value={imageUploadType}
                onChange={(event) => setImageUploadType(event.target.value as "image" | "logo")}
                disabled={uploading}
                className="mt-2 w-full rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-sm font-semibold text-zinc-100 outline-none transition focus:border-emerald-300 sm:w-40"
              >
                <option value="image">Görsel</option>
                <option value="logo">Logo</option>
              </select>
            </label>
            <Button type="button" onClick={uploadQueuedFiles} disabled={readyCount === 0 || uploading}>
              {uploading ? "Yükleniyor" : "Seçilenleri yükle"}
            </Button>
            {queue.length > 0 && (
              <Button type="button" variant="secondary" onClick={clearQueue} disabled={uploading}>
                Listeyi temizle
              </Button>
            )}
          </div>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <label
            htmlFor="mediaUpload"
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-5 py-6 text-center transition ${
              dragging
                ? "border-emerald-300/70 bg-emerald-400/10"
                : "border-white/15 bg-zinc-950/70 hover:border-emerald-300/50 hover:bg-white/[0.03]"
            }`}
          >
            <input
              ref={fileInputRef}
              id="mediaUpload"
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
              onChange={(event) => {
                if (event.target.files) addFiles(event.target.files);
              }}
              disabled={uploading}
              className="sr-only"
            />
            <span className="text-sm font-black text-zinc-100">Dosyaları buraya bırak</span>
            <span className="mt-2 text-sm text-zinc-500">Birden fazla dosya seçebilir veya sürükleyebilirsin.</span>
            <span className="mt-4 inline-flex rounded-lg bg-emerald-400 px-4 py-2 text-sm font-black text-zinc-950">
              Dosya Seç
            </span>
          </label>

          <div className="rounded-lg border border-white/10 bg-zinc-950/70 p-4">
            <p className="text-sm font-black text-white">Yükleme durumu</p>
            <div className="mt-3 space-y-2 text-sm leading-6">
              {queue.length > 0 ? (
                <p className="text-zinc-300">
                  {queue.length} dosya listede, {readyCount} dosya yüklemeye hazır.
                </p>
              ) : (
                <p className="text-zinc-500">Henüz dosya seçilmedi.</p>
              )}
              {uploadSuccess && <p className="font-semibold text-emerald-200">{uploadSuccess}</p>}
            </div>
          </div>
        </div>

        {queue.length > 0 && (
          <div className="mt-4 grid gap-3">
            {queue.map((item) => (
              <div key={item.id} className="grid gap-3 rounded-lg border border-white/10 bg-zinc-950/70 p-3 md:grid-cols-[72px_minmax(0,1fr)_140px] md:items-center">
                <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-lg border border-white/10 bg-white/[0.03]">
                  {item.previewUrl ? (
                    item.type === "video" ? (
                      <video src={item.previewUrl} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.previewUrl} alt="" className="h-full w-full object-cover" />
                    )
                  ) : (
                    <span className="text-xs font-black text-emerald-200">{typeShortLabels[item.type]}</span>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <p className="truncate text-sm font-black text-white" title={item.file.name}>{item.file.name}</p>
                    <span className={`w-fit rounded-full border px-2.5 py-1 text-xs font-bold ${
                      item.status === "success"
                        ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                        : item.status === "error" || item.status === "invalid"
                          ? "border-red-400/30 bg-red-500/10 text-red-200"
                          : "border-white/10 bg-white/5 text-zinc-300"
                    }`}>
                      {statusLabel(item.status)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
                    {formatBytes(item.file.size)} · {typeLabels[item.type]} · {item.file.type || "bilinmeyen tür"}
                  </p>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        item.status === "error" || item.status === "invalid" ? "bg-red-400" : "bg-emerald-400"
                      }`}
                      style={{ width: `${item.status === "invalid" ? 100 : item.progress}%` }}
                    />
                  </div>
                  {item.error && <p className="mt-2 text-xs font-semibold text-red-200">{item.error}</p>}
                </div>

                <div className="text-left md:text-right">
                  <p className="text-xs text-zinc-500">İlerleme</p>
                  <p className="mt-1 text-lg font-black text-white">
                    {item.status === "invalid" ? "-" : `${item.progress}%`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card className="p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Toplam medya</p>
          <p className="mt-2 text-2xl font-black text-white">{stats.total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Görseller</p>
          <p className="mt-2 text-2xl font-black text-white">{stats.images}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Videolar</p>
          <p className="mt-2 text-2xl font-black text-white">{stats.videos}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Logolar</p>
          <p className="mt-2 text-2xl font-black text-white">{stats.logos}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Kullanılan alan</p>
          <p className="mt-2 text-2xl font-black text-white">{formatBytes(stats.usedSpace)}</p>
        </Card>
      </div>

      <Card className="p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
          <SearchInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Dosya adına göre ara..."
          />
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as SortOption)}
            className="rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-sm font-semibold text-zinc-100 outline-none transition focus:border-emerald-300"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {filterOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilter(option.value)}
              className={`rounded-lg border px-3 py-2 text-sm font-bold transition ${
                filter === option.value
                  ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-100"
                  : "border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </Card>

      {error ? (
        <Card className="border-red-400/30 bg-red-500/10 p-5">
          <p className="text-sm font-semibold text-red-200">{error}</p>
        </Card>
      ) : loading ? (
        <MediaSkeleton />
      ) : items.length === 0 ? (
        <EmptyState
          title="Medya bulunamadı"
          description="Arama veya filtreyi değiştirerek tekrar dene. Henüz medya yoksa yeni dosyalar ekleyerek başlayabilirsin."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {items.map((item) => (
            <MediaTile key={item.id} item={item} onOpen={openMediaPreview} onRename={renameMedia} onDelete={deleteMediaItem} />
          ))}
        </div>
      )}
    </div>
  );
}
