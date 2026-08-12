"use client";

import { useUser } from "@clerk/nextjs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, EmptyState, Modal } from "@/components/ui";
import { mergeGeneratedContents, readCachedGeneratedContents } from "@/lib/client-content-cache";
import type { GeneratedContentRecord } from "@/lib/content-store";
import type { MediaAsset } from "@/lib/media/types";
import type { SocialPlatform, SocialProviderStatus } from "@/lib/social/types";
import type { DraftPlatformContent, PublishDraft } from "@/lib/drafts/types";
import { activeProfileId, setActiveProfileId } from "@/lib/profiles/client";

type PublishPlatform = {
  key: "instagram" | "tiktok" | "facebook" | "twitter" | "linkedIn" | "youtubeShorts";
  provider: SocialPlatform;
  label: string;
  icon: string;
};

type ParsedSections = Record<string, string>;

type PreparedPreview = {
  platform: PublishPlatform;
  text: string;
  hashtags: string[];
  visualPrompt: string;
  videoIdea: string;
  characterCount: number;
};

type ZipFile = {
  name: string;
  content: string;
};

type SelectedMediaPreview = {
  mediaId: string;
  name: string;
  signedUrl: string;
  type: MediaAsset["type"];
};

type MediaSectionKey =
  | "image-favorites"
  | "image-recent"
  | "image-all"
  | "video-favorites"
  | "video-recent"
  | "video-all";

type MediaLibrarySection = {
  key: MediaSectionKey;
  label: string;
  icon: string;
  items: MediaAsset[];
};

type PublishCenterClientProps = {
  initialItems: GeneratedContentRecord[];
  providerStatuses: SocialProviderStatus[];
  mediaAssets: MediaAsset[];
  initialDraft?: PublishDraft | null;
  initialDraftError?: string;
  resumeDraft?: PublishDraft | null;
};

const publishPlatforms: PublishPlatform[] = [
  { key: "instagram", provider: "instagram", label: "Instagram", icon: "IG" },
  { key: "tiktok", provider: "tiktok", label: "TikTok", icon: "TT" },
  { key: "facebook", provider: "facebook", label: "Facebook", icon: "FB" },
  { key: "twitter", provider: "twitter", label: "X / Twitter", icon: "X" },
  { key: "linkedIn", provider: "linkedin", label: "LinkedIn", icon: "in" },
  { key: "youtubeShorts", provider: "youtube", label: "YouTube Shorts", icon: "YT" },
];

const sectionAliases: Record<string, string[]> = {
  instagram: ["instagram"],
  tiktok: ["tiktok", "tik tok"],
  facebook: ["facebook"],
  twitter: ["x twitter", "x", "twitter", "x / twitter"],
  linkedIn: ["linkedin", "linked in"],
  youtubeShorts: ["youtube shorts", "shorts"],
  reels: ["reels", "instagram reels"],
  hashtags: ["hashtagler", "hashtags", "hashtag"],
  imagePrompts: ["görsel promptları", "görsel promptlar", "image prompts", "ai image prompts"],
};

function normalizeLabel(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/[()]/g, "")
    .replace(/[\\/#*_`]/g, " ")
    .replace(/[:：]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseSections(content: string): ParsedSections {
  const sections: ParsedSections = {};
  const lines = content.split(/\r?\n/);
  let current: string | null = null;

  for (const line of lines) {
    const cleanLine = line.replace(/^\s*[-*#\d.)]+\s*/, "").trim();
    const heading = cleanLine.split(/[:：]/)[0];
    const normalizedHeading = normalizeLabel(heading);
    const matchedKey = Object.keys(sectionAliases).find((key) =>
      sectionAliases[key].some((label) => normalizeLabel(label) === normalizedHeading)
    );

    if (matchedKey) {
      current = matchedKey;
      const inlineValue = cleanLine.split(/[:：]/).slice(1).join(":").trim();
      if (inlineValue) sections[current] = `${sections[current] ?? ""}${inlineValue}\n`;
      continue;
    }

    if (current && cleanLine) {
      sections[current] = `${sections[current] ?? ""}${line.trim()}\n`;
    }
  }

  return Object.fromEntries(Object.entries(sections).map(([key, value]) => [key, value.trim()]));
}

function extractHashtags(text: string) {
  const matches = text.match(/#[A-Za-z0-9_ğüşöçıİĞÜŞÖÇ]+/g) ?? [];
  return Array.from(new Set(matches)).slice(0, 25);
}

function platformText(platform: PublishPlatform, sections: ParsedSections, fallback: string) {
  return sections[platform.key] || sections[platform.provider] || fallback.slice(0, 1200);
}

function platformVideoIdea(platform: PublishPlatform, sections: ParsedSections) {
  if (platform.key === "instagram") return sections.reels || sections.instagram || "";
  if (platform.key === "tiktok") return sections.tiktok || "";
  if (platform.key === "youtubeShorts") return sections.youtubeShorts || "";
  return "";
}

function createPreview(platform: PublishPlatform, item: GeneratedContentRecord): PreparedPreview {
  const sections = parseSections(item.content);
  const text = platformText(platform, sections, item.content);
  const hashtags = extractHashtags(`${text}\n${sections.hashtags ?? ""}`);
  const visualPrompt = sections.imagePrompts || "Bu içerik için ayrı bir görsel promptu bulunamadı.";
  const videoIdea = platformVideoIdea(platform, sections);

  return {
    platform,
    text,
    hashtags,
    visualPrompt,
    videoIdea,
    characterCount: text.length,
  };
}

function selectedPublishPlatforms(item: GeneratedContentRecord) {
  const selectedFromMetadata = item.sections?.selectedPlatforms
    ?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (selectedFromMetadata && selectedFromMetadata.length > 0) {
    return publishPlatforms.filter((platform) => selectedFromMetadata.includes(platform.key));
  }

  const sections = parseSections(item.content);
  return publishPlatforms.filter((platform) => Boolean(sections[platform.key]));
}

function platformSlug(label: string) {
  return label
    .toLocaleLowerCase("tr-TR")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "");
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function localDateTime(value: Date) {
  return new Date(value.getTime() - value.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function visualSvg(preview: PreparedPreview) {
  const prompt = preview.visualPrompt.replace(/[<>&]/g, (match) => {
    const map: Record<string, string> = { "<": "&lt;", ">": "&gt;", "&": "&amp;" };
    return map[match];
  });
  const title = preview.platform.label.replace(/[<>&]/g, "");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
  <rect width="1200" height="675" fill="#09090b"/>
  <rect x="52" y="52" width="1096" height="571" rx="28" fill="#141416" stroke="#2f2f35"/>
  <text x="90" y="126" fill="#34d399" font-family="Arial" font-size="26" font-weight="700">BrandFlow AI</text>
  <text x="90" y="190" fill="#ffffff" font-family="Arial" font-size="58" font-weight="800">${title}</text>
  <foreignObject x="90" y="240" width="1000" height="270">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: Arial; color: #d4d4d8; font-size: 30px; line-height: 1.45;">${prompt}</div>
  </foreignObject>
  <text x="90" y="570" fill="#71717a" font-family="Arial" font-size="22">Görsel önizleme placeholder</text>
</svg>`;
}

const crcTable = (() => {
  const table = new Uint32Array(256);

  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }

  return table;
})();

function crc32(data: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeHeader(view: DataView, values: Array<[number, number, 2 | 4]>) {
  for (const [offset, value, size] of values) {
    if (size === 2) view.setUint16(offset, value, true);
    else view.setUint32(offset, value, true);
  }
}

function createZip(files: ZipFile[]) {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const data = encoder.encode(file.content);
    const name = encoder.encode(file.name);
    const checksum = crc32(data);
    const localHeader = new Uint8Array(30 + name.length);
    const localView = new DataView(localHeader.buffer);

    writeHeader(localView, [
      [0, 0x04034b50, 4],
      [4, 20, 2],
      [6, 0x0800, 2],
      [8, 0, 2],
      [10, 0, 2],
      [12, 0, 2],
      [14, checksum, 4],
      [18, data.length, 4],
      [22, data.length, 4],
      [26, name.length, 2],
      [28, 0, 2],
    ]);
    localHeader.set(name, 30);
    localParts.push(localHeader, data);

    const centralHeader = new Uint8Array(46 + name.length);
    const centralView = new DataView(centralHeader.buffer);
    writeHeader(centralView, [
      [0, 0x02014b50, 4],
      [4, 20, 2],
      [6, 20, 2],
      [8, 0x0800, 2],
      [10, 0, 2],
      [12, 0, 2],
      [14, 0, 2],
      [16, checksum, 4],
      [20, data.length, 4],
      [24, data.length, 4],
      [28, name.length, 2],
      [30, 0, 2],
      [32, 0, 2],
      [34, 0, 2],
      [36, 0, 2],
      [38, 0, 4],
      [42, offset, 4],
    ]);
    centralHeader.set(name, 46);
    centralParts.push(centralHeader);
    offset += localHeader.length + data.length;
  }

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const endHeader = new Uint8Array(22);
  const endView = new DataView(endHeader.buffer);
  writeHeader(endView, [
    [0, 0x06054b50, 4],
    [4, 0, 2],
    [6, 0, 2],
    [8, files.length, 2],
    [10, files.length, 2],
    [12, centralSize, 4],
    [16, offset, 4],
    [20, 0, 2],
  ]);

  const zipParts = [...localParts, ...centralParts, endHeader].map((part) =>
    part.buffer.slice(part.byteOffset, part.byteOffset + part.byteLength) as ArrayBuffer
  );

  return new Blob(zipParts, { type: "application/zip" });
}

function MediaPickerTile({
  item,
  selected,
  favoriteUpdating,
  onSelect,
  onToggleFavorite,
}: {
  item: MediaAsset;
  selected: boolean;
  favoriteUpdating: boolean;
  onSelect: (item: MediaAsset) => void;
  onToggleFavorite: (item: MediaAsset) => void;
}) {
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [thumbnailError, setThumbnailError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadThumbnail() {
      try {
        const response = await fetch(`/api/media/${encodeURIComponent(item.id)}/signed-url`, {
          method: "POST",
          signal: controller.signal,
        });
        const json = await response.json() as { data?: { signedUrl?: string } };
        if (!response.ok || !json.data?.signedUrl) throw new Error("Thumbnail hazırlanamadı.");
        setThumbnailUrl(json.data.signedUrl);
      } catch {
        if (!controller.signal.aborted) setThumbnailError(true);
      }
    }

    void loadThumbnail();
    return () => controller.abort();
  }, [item.id]);

  return (
    <div
      className={`relative overflow-hidden rounded-lg border bg-zinc-950 transition ${
        selected ? "border-emerald-300 ring-2 ring-emerald-300/25" : "border-white/10 hover:border-white/20"
      }`}
    >
      <button
        type="button"
        onClick={() => onSelect(item)}
        className="block w-full text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-300/60"
        aria-pressed={selected}
      >
        <div className="grid aspect-square place-items-center overflow-hidden bg-zinc-900 text-xs text-zinc-500">
          {thumbnailUrl && item.type === "video" ? (
            <video src={thumbnailUrl} muted playsInline preload="metadata" className="h-full w-full object-cover" />
          ) : thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbnailUrl} alt={item.name} className="h-full w-full object-cover" />
          ) : thumbnailError ? (
            <span>Önizleme yok</span>
          ) : (
            <span className="h-7 w-7 animate-pulse rounded-full bg-white/10" aria-label="Thumbnail hazırlanıyor" />
          )}
        </div>
        <div className="px-3 py-2.5">
          <p className="truncate text-xs font-semibold text-zinc-200">{item.name}</p>
          <p className="mt-1 text-[11px] text-zinc-500">{selected ? "Seçili medya" : item.type === "video" ? "Video" : "Görsel"}</p>
        </div>
      </button>
      <button
        type="button"
        onClick={() => onToggleFavorite(item)}
        disabled={favoriteUpdating}
        className={`absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full border text-sm shadow-lg transition focus:outline-none focus:ring-2 focus:ring-emerald-300/60 ${
          item.isFavorite
            ? "border-amber-300/50 bg-amber-300 text-zinc-950"
            : "border-white/15 bg-zinc-950/85 text-zinc-300 hover:bg-zinc-800"
        }`}
        aria-label={item.isFavorite ? `${item.name} favorilerden çıkar` : `${item.name} favorilere ekle`}
        title={item.isFavorite ? "Favorilerden çıkar" : "Favorilere ekle"}
      >
        {item.isFavorite ? "★" : "☆"}
      </button>
    </div>
  );
}

function platformIcon(status: SocialProviderStatus) {
  if (status.platform === "twitter") return "X";
  if (status.platform === "youtube") return "YT";
  if (status.platform === "linkedin") return "in";
  return status.label.slice(0, 2);
}

function connectionBadge(status: SocialProviderStatus) {
  if (status.connectionStatus === "expired") {
    return { label: "Yeniden Bağla", className: "bg-amber-300 text-zinc-950" };
  }
  if (status.connectionStatus === "error") {
    return { label: "Sorun Var", className: "bg-red-400/20 text-red-200" };
  }
  if (status.connected) {
    return { label: "Aktif", className: "bg-emerald-400 text-zinc-950" };
  }
  return { label: "Bağlı Değil", className: "bg-white/10 text-zinc-400" };
}

function CompactConnectionCard({
  status,
  onConnect,
}: {
  status: SocialProviderStatus;
  onConnect: (status: SocialProviderStatus) => void;
}) {
  const badge = connectionBadge(status);
  const account = status.accountUsername || status.accountName;
  const needsConnectionAction = !status.connected
    || status.connectionStatus === "expired"
    || status.connectionStatus === "error";
  const content = (
    <>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-xs font-black text-zinc-950">
        {platformIcon(status)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-white">{status.label}</span>
        <span className="block truncate text-xs text-zinc-500">
          {account ? `${status.accountUsername ? "@" : ""}${account.replace(/^@/, "")}` : "Hesap bağlı değil"}
        </span>
      </span>
      <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-bold ${badge.className}`}>
        {badge.label}
      </span>
    </>
  );

  if (!needsConnectionAction) {
    return (
      <div className="flex min-h-16 items-center gap-3 rounded-lg border border-emerald-400/20 bg-zinc-950/70 px-3 py-2.5">
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onConnect(status)}
      className="flex min-h-16 w-full items-center gap-3 rounded-lg border border-white/10 bg-zinc-950/70 px-3 py-2.5 text-left transition hover:border-white/20 hover:bg-white/[0.03] focus:outline-none focus:ring-2 focus:ring-emerald-300/60"
      aria-label={`${status.label} hesabını bağla`}
    >
      {content}
    </button>
  );
}

function CompactContentCard({
  preview,
  media,
  prepared,
  status,
  publishing,
  onOpen,
  onPublish,
  onSchedule,
}: {
  preview: PreparedPreview;
  media: SelectedMediaPreview | null;
  prepared: boolean;
  status?: SocialProviderStatus;
  publishing: boolean;
  onOpen: () => void;
  onPublish: () => void;
  onSchedule: () => void;
}) {
  return (
    <Card className="overflow-hidden p-0">
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-3 p-3 text-left transition hover:bg-white/[0.03] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-300/60 sm:p-4"
        aria-label={`${preview.platform.label} içerik detaylarını gör`}
      >
        <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-lg border border-white/10 bg-zinc-950 text-xs text-zinc-500 sm:h-24 sm:w-24">
          {media?.type === "video" ? (
            <video src={media.signedUrl} muted playsInline preload="metadata" className="h-full w-full object-cover" />
          ) : media ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={media.signedUrl} alt={media.name} className="h-full w-full object-cover" />
          ) : (
            <span>Medya yok</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-black text-white sm:text-base">{preview.platform.label} İçeriği</h3>
            <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-bold ${prepared ? "bg-emerald-400 text-zinc-950" : "bg-white/10 text-zinc-400"}`}>
              {prepared ? "Hazır" : "Taslak"}
            </span>
          </div>
          <p className="mt-2 line-clamp-2 text-sm leading-5 text-zinc-400">{preview.text}</p>
          <div className="mt-2 flex items-center gap-3 text-xs text-zinc-500">
            <span>{preview.characterCount} karakter</span>
            <span className="font-semibold text-emerald-300">Detayları Gör</span>
          </div>
        </div>
      </button>
      <div className="flex flex-col gap-2 border-t border-white/10 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-end sm:px-4">
        <Button type="button" variant="secondary" onClick={onOpen} className="px-3 py-2 text-xs">
          Detayları Gör
        </Button>
        <Button type="button" variant="secondary" onClick={onSchedule} disabled={publishing} className="px-3 py-2 text-xs">Planla</Button>
        <Button type="button" onClick={onPublish} disabled={publishing} className="px-3 py-2 text-xs">
          {publishing ? "Paylaşılıyor..." : status?.connected ? "Şimdi Paylaş" : "Önce hesabını bağla"}
        </Button>
      </div>
    </Card>
  );
}

export function PublishCenterClient({ initialItems, providerStatuses, mediaAssets, initialDraft = null, initialDraftError = "", resumeDraft = null }: PublishCenterClientProps) {
  const [items, setItems] = useState(initialItems);
  const [mediaItems, setMediaItems] = useState(mediaAssets);
  const initialSelectedId = initialDraft?.sourceContentId && initialItems.some((item) => item.id === initialDraft.sourceContentId) ? initialDraft.sourceContentId : initialItems[0]?.id ?? "";
  const [selectedId, setSelectedId] = useState(initialSelectedId);
  const [selectedMediaId, setSelectedMediaId] = useState(initialDraft?.mediaAssetId ?? "");
  const [selectedMediaPreview, setSelectedMediaPreview] = useState<SelectedMediaPreview | null>(null);
  const [mediaPreviewLoading, setMediaPreviewLoading] = useState(false);
  const [openMediaSection, setOpenMediaSection] = useState<MediaSectionKey | null>(null);
  const [favoriteUpdatingIds, setFavoriteUpdatingIds] = useState<string[]>([]);
  const [prepared, setPrepared] = useState(initialDraft?.platformSettings.prepared === true);
  const [message, setMessage] = useState(initialDraftError);
  const [messageType, setMessageType] = useState<"success" | "error" | "info">(initialDraftError ? "error" : "info");
  const [publishingPlatform, setPublishingPlatform] = useState<SocialPlatform | null>(null);
  const [detailPreview, setDetailPreview] = useState<PreparedPreview | null>(null);
  const [connectInfo, setConnectInfo] = useState<SocialProviderStatus | null>(null);
  const [draftId, setDraftId] = useState(initialDraft?.id ?? "");
  const [draftName, setDraftName] = useState(initialDraft?.name ?? "");
  const [draftPlatformKeys, setDraftPlatformKeys] = useState<string[] | null>(initialDraft?.selectedPlatforms ?? null);
  const [draftPlatformContent, setDraftPlatformContent] = useState<Record<string, DraftPlatformContent> | null>(initialDraft?.platformContent ?? null);
  const [draftSettings, setDraftSettings] = useState<Record<string, unknown>>(initialDraft?.platformSettings ?? {});
  const [savingDraft, setSavingDraft] = useState(false);
  const [schedulePreview, setSchedulePreview] = useState<PreparedPreview | null>(null);
  const [scheduleAt, setScheduleAt] = useState(() => localDateTime(new Date(Date.now() + 60 * 60 * 1000)));
  const [scheduleTimezone, setScheduleTimezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  const [scheduling, setScheduling] = useState(false);
  const [resumeDraftState, setResumeDraftState] = useState(resumeDraft);
  const [activeProfileStateId, setActiveProfileStateId] = useState(initialDraft?.profileId ?? "");
  const [profileReady, setProfileReady] = useState(false);
  const autoSaveReadyRef = useRef(false);
  const lastAutoSaveSignatureRef = useRef("");
  const mediaLibraryRef = useRef<HTMLDivElement>(null);
  const { user } = useUser();

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedId) ?? items[0] ?? null,
    [items, selectedId]
  );
  const visiblePlatforms = useMemo(
    () => draftPlatformKeys
      ? publishPlatforms.filter((platform) => draftPlatformKeys.includes(platform.key))
      : selectedItem ? selectedPublishPlatforms(selectedItem) : [],
    [draftPlatformKeys, selectedItem]
  );
  const previews = useMemo(
    () => visiblePlatforms.map((platform) => {
      const restored = draftPlatformContent?.[platform.key];
      if (restored) return { platform, ...restored, characterCount: restored.text.length };
      return selectedItem ? createPreview(platform, selectedItem) : { platform, text: "", hashtags: [], visualPrompt: "", videoIdea: "", characterCount: 0 };
    }),
    [draftPlatformContent, selectedItem, visiblePlatforms]
  );
  const statusByPlatform = useMemo(
    () => Object.fromEntries(providerStatuses.map((status) => [status.platform, status])),
    [providerStatuses]
  ) as Record<SocialPlatform, SocialProviderStatus | undefined>;
  const selectableMedia = useMemo(
    () => mediaItems.filter((item) => item.type === "image" || item.type === "logo" || item.type === "video"),
    [mediaItems]
  );
  const mediaSections = useMemo(() => {
    const images = selectableMedia.filter((item) => item.type === "image" || item.type === "logo");
    const videos = selectableMedia.filter((item) => item.type === "video");
    const isNew = (item: MediaAsset) => !item.viewedAt;

    return {
      images: [
        { key: "image-favorites", label: "Favoriler", icon: "♥", items: images.filter((item) => item.isFavorite) },
        { key: "image-recent", label: "Yeni Yapılanlar", icon: "✦", items: images.filter(isNew) },
        { key: "image-all", label: "Tüm Görseller", icon: "▧", items: images },
      ] satisfies MediaLibrarySection[],
      videos: [
        { key: "video-favorites", label: "Favoriler", icon: "♥", items: videos.filter((item) => item.isFavorite) },
        { key: "video-recent", label: "Yeni Yapılanlar", icon: "✦", items: videos.filter(isNew) },
        { key: "video-all", label: "Tüm Videolar", icon: "▶", items: videos },
      ] satisfies MediaLibrarySection[],
    };
  }, [selectableMedia]);
  const selectedMedia = useMemo(
    () => selectableMedia.find((media) => media.id === selectedMediaId) ?? null,
    [selectableMedia, selectedMediaId]
  );
  const displayedMediaPreview = useMemo(
    () => selectedMediaPreview?.mediaId === selectedMediaId
      && selectedMedia?.id === selectedMediaId
      ? selectedMediaPreview
      : null,
    [selectedMedia, selectedMediaId, selectedMediaPreview]
  );

  useEffect(() => {
    if (!user?.id) return;

    const timer = window.setTimeout(() => {
      setItems(mergeGeneratedContents(initialItems, readCachedGeneratedContents(user.id)));
    }, 0);

    return () => window.clearTimeout(timer);
  }, [initialItems, user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    if (initialDraft?.profileId) setActiveProfileId(user.id, initialDraft.profileId);
    const syncProfile = () => {
      setActiveProfileStateId(activeProfileId(user.id));
      setProfileReady(true);
    };
    const timer = window.setTimeout(syncProfile, 0);
    window.addEventListener("brandflow:active-profile-change", syncProfile);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("brandflow:active-profile-change", syncProfile);
    };
  }, [initialDraft?.profileId, user?.id]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("instagram_oauth") !== "start") return;
    url.searchParams.delete("instagram_oauth");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    window.location.replace("/api/connections/instagram/start");
  }, []);

  useEffect(() => {
    if (!selectedMediaId) return;

    if (!selectedMedia) return;
    const mediaId = selectedMedia.id;
    const mediaName = selectedMedia.name;
    const mediaType = selectedMedia.type;

    const controller = new AbortController();

    async function loadSelectedMediaPreview() {
      try {
        const response = await fetch(`/api/media/${encodeURIComponent(mediaId)}/signed-url`, {
          method: "POST",
          signal: controller.signal,
        });
        const json = await response.json() as {
          data?: { media?: MediaAsset; signedUrl?: string };
          error?: string;
        };

        if (!response.ok || !json.data?.signedUrl || json.data.media?.id !== mediaId) {
          throw new Error(json.error || "Görsel önizlemesi hazırlanamadı.");
        }

        setSelectedMediaPreview({
          mediaId,
          name: mediaName,
          signedUrl: json.data.signedUrl,
          type: mediaType,
        });
      } catch (cause) {
        if (controller.signal.aborted) return;
        setSelectedMediaPreview(null);
        setMessageType("error");
        setMessage(cause instanceof Error ? cause.message : "Görsel önizlemesi hazırlanamadı.");
      } finally {
        if (!controller.signal.aborted) setMediaPreviewLoading(false);
      }
    }

    void loadSelectedMediaPreview();
    return () => controller.abort();
  }, [selectedMedia, selectedMediaId]);

  function selectContent(id: string) {
    setSelectedId(id);
    setDraftPlatformKeys(null);
    setDraftPlatformContent(null);
    setPrepared(false);
    setMessage("");
  }

  const saveCurrentDraft = useCallback(async (silent = false) => {
    if (!previews.length) {
      if (!silent) {
        setMessageType("error");
        setMessage("Taslak için en az bir platform içeriği gerekli.");
      }
      return;
    }
    if (!silent) {
      setSavingDraft(true);
      setMessageType("info");
      setMessage("Taslak kaydediliyor...");
    }
    const content = Object.fromEntries(previews.map((preview) => [preview.platform.key, {
      text: preview.text, hashtags: preview.hashtags, visualPrompt: preview.visualPrompt, videoIdea: preview.videoIdea,
    }]));
    const firstText = previews[0]?.text || "";
    const name = draftName || selectedItem?.product || firstText.split(/\r?\n/)[0]?.slice(0, 120) || "İsimsiz taslak";
    try {
      const response = await fetch("/api/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: draftId || undefined,
          profileId: activeProfileStateId || null,
          sourceContentId: selectedItem?.id || null,
          mediaAssetId: selectedMediaId || null,
          name,
          selectedPlatforms: previews.map((preview) => preview.platform.key),
          caption: firstText,
          hashtags: Array.from(new Set(previews.flatMap((preview) => preview.hashtags))),
          platformContent: content,
          platformSettings: { ...draftSettings, prepared },
        }),
      });
      const payload = await response.json().catch(() => ({})) as { data?: PublishDraft; error?: string };
      if (!response.ok || !payload.data) throw new Error(payload.error || "Taslak kaydedilemedi.");
      setDraftId(payload.data.id);
      setDraftName(payload.data.name);
      setDraftPlatformKeys(payload.data.selectedPlatforms);
      setDraftPlatformContent(payload.data.platformContent);
      setDraftSettings(payload.data.platformSettings);
      if (!silent) {
        setMessageType("success");
        setMessage(draftId ? "Taslak güncellendi." : "Taslak kaydedildi.");
      }
      window.history.replaceState({}, "", `/publish?draft=${encodeURIComponent(payload.data.id)}`);
    } catch (cause) {
      if (!silent) {
        setMessageType("error");
        setMessage(cause instanceof Error ? cause.message : "Taslak kaydedilemedi.");
      }
    } finally {
      if (!silent) setSavingDraft(false);
    }
  }, [activeProfileStateId, draftId, draftName, draftSettings, prepared, previews, selectedItem, selectedMediaId]);

  const autoSaveSignature = useMemo(() => JSON.stringify({
    activeProfileStateId, selectedMediaId, selectedId, prepared,
    platforms: previews.map((preview) => ({ key: preview.platform.key, text: preview.text, hashtags: preview.hashtags, visualPrompt: preview.visualPrompt, videoIdea: preview.videoIdea })),
    settings: draftSettings,
  }), [activeProfileStateId, draftSettings, prepared, previews, selectedId, selectedMediaId]);

  useEffect(() => {
    if (!user?.id || !profileReady || !previews.length) return;
    if (!autoSaveReadyRef.current) {
      autoSaveReadyRef.current = true;
      lastAutoSaveSignatureRef.current = autoSaveSignature;
      return;
    }
    if (lastAutoSaveSignatureRef.current === autoSaveSignature) return;
    const timer = window.setTimeout(() => {
      lastAutoSaveSignatureRef.current = autoSaveSignature;
      void saveCurrentDraft(true);
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [autoSaveSignature, previews.length, profileReady, saveCurrentDraft, user?.id]);

  async function deleteResumeDraft() {
    if (!resumeDraftState) return;
    const response = await fetch(`/api/drafts/${encodeURIComponent(resumeDraftState.id)}`, { method: "DELETE" });
    if (response.ok) setResumeDraftState(null);
    else {
      const payload = await response.json().catch(() => ({})) as { error?: string };
      setMessageType("error");
      setMessage(payload.error || "Taslak silinemedi.");
    }
  }

  function toggleDraftPlatform(platformKey: PublishPlatform["key"]) {
    const currentKeys = visiblePlatforms.map((platform) => platform.key);
    const nextKeys = currentKeys.includes(platformKey) ? currentKeys.filter((key) => key !== platformKey) : [...currentKeys, platformKey];
    if (!draftPlatformContent) {
      setDraftPlatformContent(Object.fromEntries(previews.map((preview) => [preview.platform.key, {
        text: preview.text, hashtags: preview.hashtags, visualPrompt: preview.visualPrompt, videoIdea: preview.videoIdea,
      }])));
    }
    setDraftPlatformKeys(nextKeys);
  }

  function updatePreviewContent(platformKey: PublishPlatform["key"], update: Partial<DraftPlatformContent>) {
    const base = previews.find((preview) => preview.platform.key === platformKey);
    if (!base) return;
    const next = { text: base.text, hashtags: base.hashtags, visualPrompt: base.visualPrompt, videoIdea: base.videoIdea, ...update };
    setDraftPlatformContent((current) => ({ ...(current || {}), [platformKey]: next }));
    setDetailPreview((current) => current?.platform.key === platformKey ? { ...current, ...next, characterCount: next.text.length } : current);
  }

  function selectMedia(item: MediaAsset) {
    if (item.id !== selectedMediaId || !displayedMediaPreview) {
      setSelectedMediaPreview(null);
      setMediaPreviewLoading(true);
      setSelectedMediaId(item.id);
    }
    if (!item.viewedAt) void markMediaViewed(item);
  }

  async function markMediaViewed(item: MediaAsset) {
    const viewedAt = new Date().toISOString();
    setMediaItems((current) => current.map((media) => (
      media.id === item.id ? { ...media, viewedAt } : media
    )));

    try {
      const response = await fetch(`/api/media/${encodeURIComponent(item.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ viewedAt }),
      });
      const json = await response.json() as { data?: MediaAsset; error?: string };
      if (!response.ok || !json.data) throw new Error(json.error || "Yeni medya durumu güncellenemedi.");
      const persistedViewedAt = json.data.viewedAt;
      setMediaItems((current) => current.map((media) => (
        media.id === item.id ? { ...media, viewedAt: persistedViewedAt } : media
      )));
    } catch (cause) {
      setMediaItems((current) => current.map((media) => (
        media.id === item.id ? { ...media, viewedAt: item.viewedAt } : media
      )));
      setMessageType("error");
      setMessage(cause instanceof Error ? cause.message : "Yeni medya durumu güncellenemedi.");
    }
  }

  async function toggleMediaFavorite(item: MediaAsset) {
    if (favoriteUpdatingIds.includes(item.id)) return;

    const nextFavorite = !item.isFavorite;
    setFavoriteUpdatingIds((current) => [...current, item.id]);
    setMediaItems((current) => current.map((media) => (
      media.id === item.id ? { ...media, isFavorite: nextFavorite } : media
    )));

    try {
      const response = await fetch(`/api/media/${encodeURIComponent(item.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: nextFavorite }),
      });
      const json = await response.json() as { data?: MediaAsset; error?: string };
      if (!response.ok || !json.data) throw new Error(json.error || "Favori durumu güncellenemedi.");
      setMediaItems((current) => current.map((media) => media.id === item.id ? json.data as MediaAsset : media));
    } catch (cause) {
      setMediaItems((current) => current.map((media) => (
        media.id === item.id ? { ...media, isFavorite: item.isFavorite } : media
      )));
      setMessageType("error");
      setMessage(cause instanceof Error ? cause.message : "Favori durumu güncellenemedi.");
    } finally {
      setFavoriteUpdatingIds((current) => current.filter((id) => id !== item.id));
    }
  }

  function changeSelectedMedia() {
    const section: MediaSectionKey = selectedMedia?.type === "video" ? "video-all" : "image-all";
    setOpenMediaSection(section);
    window.setTimeout(() => {
      mediaLibraryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }

  function renderMediaSection(section: MediaLibrarySection) {
    const open = openMediaSection === section.key;

    return (
      <div key={section.key} className="overflow-hidden rounded-lg border border-white/10 bg-zinc-950/60">
        <button
          type="button"
          onClick={() => setOpenMediaSection(open ? null : section.key)}
          className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white/[0.04] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-300/60"
          aria-expanded={open}
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-white/10 text-sm text-zinc-200" aria-hidden="true">
            {section.icon}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-200">{section.label}</span>
          <span className="rounded-md bg-white/10 px-2 py-1 text-xs font-bold tabular-nums text-zinc-300">
            {section.items.length}
          </span>
          <span className={`text-lg text-zinc-500 transition-transform ${open ? "rotate-90" : ""}`} aria-hidden="true">›</span>
        </button>

        {open && (
          <div className="border-t border-white/10 p-3">
            {section.items.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {section.items.map((item) => (
                  <MediaPickerTile
                    key={item.id}
                    item={item}
                    selected={item.id === selectedMediaId}
                    favoriteUpdating={favoriteUpdatingIds.includes(item.id)}
                    onSelect={selectMedia}
                    onToggleFavorite={(media) => void toggleMediaFavorite(media)}
                  />
                ))}
              </div>
            ) : (
              <p className="rounded-md border border-dashed border-white/10 px-4 py-6 text-center text-sm text-zinc-500">
                Bu kategoride henüz medya yok.
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  function connectAccount(status: SocialProviderStatus) {
    if (status.connected) return;
    if (status.platform === "instagram" && status.configured) {
      window.location.assign("/api/connections/instagram/start");
      return;
    }
    setConnectInfo(status);
  }

  function prepareAll() {
    if (!selectedItem) {
      setMessage("Önce hazırlanacak bir içerik seç.");
      return;
    }

    setPrepared(true);
    setMessage("Tüm platform metinleri hazırlandı. Kopyalayabilir, görselleri indirebilir veya ZIP paketi alabilirsin.");
  }

  async function copyPreview(preview: PreparedPreview) {
    await navigator.clipboard.writeText(
      `${preview.platform.label}\n\n${preview.text}\n\n${preview.hashtags.join(" ")}`
    );
    setMessage(`${preview.platform.label} metni kopyalandı.`);
  }

  async function copyAll() {
    await navigator.clipboard.writeText(
      previews
        .map((preview) => `${preview.platform.label}\n\n${preview.text}\n\n${preview.hashtags.join(" ")}`)
        .join("\n\n---\n\n")
    );
    setMessage("Tüm seçili platform metinleri kopyalandı.");
  }

  function downloadText(preview: PreparedPreview) {
    downloadBlob(
      new Blob([
        `${preview.platform.label}\n\nMetin:\n${preview.text}\n\nHashtag:\n${preview.hashtags.join(" ")}\n\nVideo fikri / senaryo:\n${preview.videoIdea || "Bu platform için video fikri bulunamadı."}\n`,
      ], { type: "text/plain;charset=utf-8" }),
      `${platformSlug(preview.platform.label)}-icerik.txt`
    );
    setMessage(`${preview.platform.label} içerik dosyası indirildi.`);
  }

  function downloadVisual(preview: PreparedPreview) {
    downloadBlob(
      new Blob([visualSvg(preview)], { type: "image/svg+xml;charset=utf-8" }),
      `${platformSlug(preview.platform.label)}-gorsel-onizleme.svg`
    );
    setMessage(`${preview.platform.label} görsel önizlemesi indirildi.`);
  }

  function downloadZip() {
    if (!selectedItem) return;

    const files = previews.flatMap((preview) => [
      {
        name: `${platformSlug(preview.platform.label)}-metin.txt`,
        content: `${preview.platform.label}\n\nMetin:\n${preview.text}\n\nHashtag:\n${preview.hashtags.join(" ")}\n\nVideo fikri / senaryo:\n${preview.videoIdea || "Bu platform için video fikri bulunamadı."}\n`,
      },
      {
        name: `${platformSlug(preview.platform.label)}-gorsel.svg`,
        content: visualSvg(preview),
      },
    ]);

    downloadBlob(createZip(files), `${platformSlug(selectedItem.product || "brandflow")}-paylasim-paketi.zip`);
    setMessage("ZIP paketi hazırlandı ve indirildi.");
  }

  async function publishNow(preview: PreparedPreview) {
    const status = statusByPlatform[preview.platform.provider];
    if (!status?.connected) {
      setMessageType("error");
      setMessage(`${preview.platform.label} için önce hesabını bağla.`);
      if (status) setConnectInfo(status);
      return;
    }
    if (preview.platform.provider !== "instagram") {
      setMessageType("error");
      setMessage(`${preview.platform.label} için gerçek paylaşım sağlayıcısı henüz etkin değil.`);
      return;
    }
    if (!displayedMediaPreview) {
      setMessageType("error");
      setMessage(
        mediaPreviewLoading
          ? "Görsel önizlemesi hazırlanıyor. Lütfen tamamlanmasını bekle."
          : "Instagram paylaşımı için Medya Merkezi'nden bir görsel seç."
      );
      return;
    }
    const mediaAssetId = displayedMediaPreview.mediaId;
    const caption = `${preview.text}\n\n${preview.hashtags.join(" ")}`.trim();
    if (caption.length > 2200) {
      setMessageType("error");
      setMessage("Instagram açıklaması 2200 karakterden uzun. Metni kısaltıp tekrar dene.");
      return;
    }
    setPublishingPlatform("instagram");
    setMessageType("info");
    setMessage("Instagram paylaşımı gönderiliyor...");
    try {
      const response = await fetch("/api/publish/instagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaAssetId, caption }),
      });
      const json = await response.json() as { data?: { mediaId: string }; error?: string };
      if (!response.ok || !json.data) throw new Error(json.error || "Instagram paylaşımı tamamlanamadı.");
      if (draftId) {
        await fetch(`/api/drafts/${encodeURIComponent(draftId)}`, { method: "DELETE" });
        setDraftId("");
        window.history.replaceState({}, "", "/publish");
      }
      setMessageType("success");
      setMessage("Instagram paylaşımı başarıyla yayınlandı.");
    } catch (cause) {
      setMessageType("error");
      setMessage(cause instanceof Error ? cause.message : "Instagram paylaşımı tamamlanamadı.");
    } finally {
      setPublishingPlatform(null);
    }
  }

  function openSchedule(preview: PreparedPreview) {
    if (preview.platform.provider !== "instagram") {
      setMessageType("error");
      setMessage(`${preview.platform.label} için gerçek otomatik yayın sağlayıcısı henüz etkin değil.`);
      return;
    }
    if (!statusByPlatform.instagram?.connected) {
      setMessageType("error"); setMessage("Planlamak için önce Instagram hesabını bağla."); return;
    }
    if (!displayedMediaPreview || displayedMediaPreview.type === "video") {
      setMessageType("error"); setMessage("Instagram planı için Medya Merkezi'nden bir görsel seç."); return;
    }
    setSchedulePreview(preview);
  }

  async function schedulePublish() {
    if (!schedulePreview || !displayedMediaPreview) return;
    const date = new Date(scheduleAt);
    if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) { setMessageType("error"); setMessage("Gelecekte bir tarih ve saat seç."); return; }
    const caption = `${schedulePreview.text}\n\n${schedulePreview.hashtags.join(" ")}`.trim();
    setScheduling(true);
    try {
      const response = await fetch("/api/scheduled-publishes", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: activeProfileStateId || null, mediaAssetId: displayedMediaPreview.mediaId, platforms: ["instagram"], title: schedulePreview.text.split(/\r?\n/)[0], caption, hashtags: schedulePreview.hashtags, platformContent: { instagram: { text: schedulePreview.text, hashtags: schedulePreview.hashtags, visualPrompt: schedulePreview.visualPrompt, videoIdea: schedulePreview.videoIdea } }, scheduledAt: date.toISOString(), timezone: scheduleTimezone }),
      });
      const json = await response.json().catch(() => ({})) as { data?: { id: string }; error?: string };
      if (!response.ok || !json.data) throw new Error(json.error || "Paylaşım planlanamadı.");
      if (draftId) { await fetch(`/api/drafts/${encodeURIComponent(draftId)}`, { method: "DELETE" }); setDraftId(""); window.history.replaceState({}, "", "/publish"); }
      setSchedulePreview(null); setMessageType("success"); setMessage("Paylaşım planlandı. Planlananlar ve Calendar ekranında görebilirsin.");
    } catch (cause) { setMessageType("error"); setMessage(cause instanceof Error ? cause.message : "Paylaşım planlanamadı."); }
    finally { setScheduling(false); }
  }

  const resumeBanner = resumeDraftState ? (
    <Card className="flex flex-col gap-3 border-amber-300/20 bg-amber-300/[0.06] p-4 sm:flex-row sm:items-center sm:justify-between">
      <div><p className="font-bold text-white">Yarım kalan çalışman var</p><p className="mt-1 text-sm text-zinc-400">{resumeDraftState.name} · {new Date(resumeDraftState.updatedAt).toLocaleString("tr-TR")}</p></div>
      <div className="flex gap-2"><Button type="button" onClick={() => window.location.assign(`/publish?draft=${encodeURIComponent(resumeDraftState.id)}`)}>Devam Et</Button><Button type="button" variant="ghost" onClick={() => void deleteResumeDraft()}>Sil</Button></div>
    </Card>
  ) : null;

  if (items.length === 0 && !initialDraft) {
    return (
      <div className="space-y-4">{resumeBanner}<EmptyState title="Paylaşılacak içerik yok" description="Önce ana ekrandan bir içerik üret. Oluşturulan içerikler burada paylaşım için hazırlanacak." /></div>
    );
  }

  return (
    <div className="space-y-5">
      {resumeBanner}
      <Card className="p-4 sm:p-5">
        <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-end">
          <label className="block text-sm font-semibold text-zinc-200" htmlFor="generatedContent">
            Üretilen içerik seç
            <select
              id="generatedContent"
              value={selectedItem?.id ?? ""}
              onChange={(event) => selectContent(event.target.value)}
              className="mt-2 w-full rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-emerald-300"
            >
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.product} - {new Date(item.created_at).toLocaleDateString("tr-TR")}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="secondary" onClick={() => void saveCurrentDraft()} disabled={savingDraft || previews.length === 0} className="py-3">
              {savingDraft ? "Kaydediliyor..." : draftId ? "Taslağı Güncelle" : "Taslak Kaydet"}
            </Button>
            <Button type="button" onClick={prepareAll} className="py-3">
              Tümüne Hazırla
            </Button>
            <Button type="button" variant="secondary" onClick={copyAll} disabled={!prepared || previews.length === 0} className="py-3">
              Tümünü Kopyala
            </Button>
            <Button type="button" variant="secondary" onClick={downloadZip} disabled={!prepared || previews.length === 0} className="py-3">
              Tümünü İndir
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-4">
          {publishPlatforms.map((platform) => {
            const checked = visiblePlatforms.some((item) => item.key === platform.key);
            return <label key={platform.key} className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold ${checked ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" : "border-white/10 text-zinc-500"}`}><input type="checkbox" checked={checked} onChange={() => toggleDraftPlatform(platform.key)} className="accent-emerald-400" />{platform.label}</label>;
          })}
        </div>

        <div ref={mediaLibraryRef} className="mt-5 border-t border-white/10 pt-5 scroll-mt-5">
          <div>
            <h2 className="text-base font-black text-white">Medya kitaplığı</h2>
            <p className="mt-1 text-sm text-zinc-500">Bir kategori açıp paylaşılacak medyayı seç.</p>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <section aria-labelledby="imageLibraryTitle">
              <h3 id="imageLibraryTitle" className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Görseller</h3>
              <div className="space-y-2">{mediaSections.images.map(renderMediaSection)}</div>
            </section>
            <section aria-labelledby="videoLibraryTitle">
              <h3 id="videoLibraryTitle" className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Videolar</h3>
              <div className="space-y-2">{mediaSections.videos.map(renderMediaSection)}</div>
            </section>
          </div>
        </div>

        <div className="mt-5 border-t border-white/10 pt-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="w-full max-w-xl">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Paylaşılacak medya</p>
              {mediaPreviewLoading ? (
                <div className="mt-3 aspect-[4/3] animate-pulse rounded-lg border border-white/10 bg-white/5" aria-label="Görsel önizlemesi hazırlanıyor" />
              ) : displayedMediaPreview ? (
                <div className="mt-3 overflow-hidden rounded-lg border border-white/10 bg-zinc-950">
                  {displayedMediaPreview.type === "video" ? (
                    <video src={displayedMediaPreview.signedUrl} controls playsInline className="aspect-[4/3] w-full bg-black object-contain" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={displayedMediaPreview.signedUrl}
                      alt={`Seçili görsel: ${displayedMediaPreview.name}`}
                      className="aspect-[4/3] w-full object-contain"
                    />
                  )}
                  <div className="border-t border-white/10 px-4 py-3">
                    <p className="truncate text-sm font-semibold text-zinc-200">{displayedMediaPreview.name}</p>
                    <p className="mt-1 break-all text-xs text-zinc-500">Medya ID: {displayedMediaPreview.mediaId}</p>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex aspect-[4/3] items-center justify-center rounded-lg border border-dashed border-white/15 bg-zinc-950/60 p-6 text-center text-sm leading-6 text-zinc-500">
                  Henüz medya seçilmedi. Paylaşmadan önce yukarıdaki kitaplıktan bir görsel veya video seç.
                </div>
              )}
            </div>

            <Button
              type="button"
              variant="secondary"
              disabled={publishingPlatform === "instagram"}
              onClick={changeSelectedMedia}
              className="lg:mt-7"
            >
              Değiştir
            </Button>
          </div>
        </div>
        {message && (
          <div className={`mt-4 rounded-lg border p-3 text-sm ${messageType === "error" ? "border-red-400/30 bg-red-400/10 text-red-200" : messageType === "success" ? "border-emerald-400/20 bg-emerald-400/5 text-emerald-100" : "border-sky-400/20 bg-sky-400/5 text-sky-100"}`}>
            {message}
          </div>
        )}
      </Card>

      <Card className="p-4 sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-black text-white">Sosyal hesap bağlantıları</h2>
            <p className="mt-1 text-sm text-zinc-500">Gerçek OAuth ve hesap bağlantısı olmadan paylaşım aktif olmaz.</p>
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Sahte başarı yok</p>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {providerStatuses.map((status) => (
            <CompactConnectionCard key={status.platform} status={status} onConnect={connectAccount} />
          ))}
        </div>
      </Card>

      {previews.length === 0 ? (
        <EmptyState
          title="Bu içerikte paylaşılacak platform bulunamadı"
          description="İçerik üretirken Instagram, TikTok, Facebook, X / Twitter, LinkedIn veya YouTube Shorts bölümlerinden en az birini seç."
        />
      ) : (
      <div className="grid gap-4 xl:grid-cols-2">
        {previews.map((preview) => {
          const status = statusByPlatform[preview.platform.provider];
          return (
            <CompactContentCard
              key={preview.platform.key}
              preview={preview}
              media={displayedMediaPreview}
              prepared={prepared}
              status={status}
              publishing={publishingPlatform === preview.platform.provider}
              onOpen={() => setDetailPreview(preview)}
              onSchedule={() => openSchedule(preview)}
              onPublish={() => void publishNow(preview)}
            />
          );
        })}
      </div>
      )}

      <Modal
        title={detailPreview ? `${detailPreview.platform.label} İçeriği` : "İçerik Detayı"}
        open={Boolean(detailPreview)}
        onClose={() => setDetailPreview(null)}
      >
        {detailPreview && (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-lg border border-white/10 bg-zinc-950">
              {displayedMediaPreview?.type === "video" ? (
                <video src={displayedMediaPreview.signedUrl} controls playsInline className="max-h-[52vh] w-full bg-black object-contain" />
              ) : displayedMediaPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={displayedMediaPreview.signedUrl} alt={displayedMediaPreview.name} className="max-h-[52vh] w-full object-contain" />
              ) : (
                <div className="grid min-h-56 place-items-center px-6 text-center text-sm text-zinc-500">
                  Paylaşılacak medya henüz seçilmedi.
                </div>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-white/10 bg-zinc-950/70 p-3">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">Seçili medya</p>
                <p className="mt-2 break-words text-sm font-semibold text-zinc-200">
                  {displayedMediaPreview?.name || "Medya seçilmedi"}
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-zinc-950/70 p-3">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">Yayın durumu</p>
                <p className="mt-2 text-sm font-semibold text-zinc-200">
                  {publishingPlatform === "instagram" ? "Paylaşılıyor" : prepared ? "Paylaşıma hazır" : "Taslak"}
                </p>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">Caption</p>
                <span className="text-xs text-zinc-500">{detailPreview.characterCount} karakter</span>
              </div>
              <textarea value={detailPreview.text} onChange={(event) => updatePreviewContent(detailPreview.platform.key, { text: event.target.value })} rows={7} className="mt-2 w-full resize-y rounded-lg border border-white/10 bg-zinc-950 p-4 text-sm leading-6 text-zinc-300 outline-none focus:border-emerald-400/50" />
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">Hashtagler</p>
              <textarea value={detailPreview.hashtags.join(" ")} onChange={(event) => updatePreviewContent(detailPreview.platform.key, { hashtags: extractHashtags(event.target.value) })} rows={3} placeholder="#brandflow #sosyalmedya" className="mt-2 w-full resize-y rounded-lg border border-white/10 bg-zinc-950 p-4 text-sm leading-6 text-zinc-300 outline-none focus:border-emerald-400/50" />
            </div>

            {detailPreview.videoIdea && (
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">Video fikri veya senaryo</p>
                <p className="mt-2 rounded-lg border border-white/10 bg-zinc-950 p-4 text-sm leading-6 text-zinc-300">
                  {detailPreview.videoIdea}
                </p>
              </div>
            )}

            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">{detailPreview.platform.label} ayarları</p>
              <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-zinc-500">Hesap</dt>
                  <dd className="mt-1 font-semibold text-zinc-200">
                    {statusByPlatform[detailPreview.platform.provider]?.accountUsername
                      ? `@${statusByPlatform[detailPreview.platform.provider]?.accountUsername?.replace(/^@/, "")}`
                      : statusByPlatform[detailPreview.platform.provider]?.accountName || "Hesap bilgisi yok"}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Bağlantı</dt>
                  <dd className="mt-1 font-semibold text-zinc-200">
                    {statusByPlatform[detailPreview.platform.provider]?.connected ? "Aktif" : "Bağlı değil"}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
              <Button type="button" variant="secondary" onClick={() => copyPreview(detailPreview)} disabled={!prepared}>
                Metni kopyala
              </Button>
              <Button type="button" variant="secondary" onClick={() => downloadText(detailPreview)} disabled={!prepared}>
                İçeriği indir
              </Button>
              <Button type="button" variant="secondary" onClick={() => downloadVisual(detailPreview)}>
                Görsel indir
              </Button>
              <Button
                type="button"
                onClick={() => void publishNow(detailPreview)}
                disabled={publishingPlatform === detailPreview.platform.provider}
              >
                {publishingPlatform === detailPreview.platform.provider
                  ? "Paylaşılıyor..."
                  : statusByPlatform[detailPreview.platform.provider]?.connected
                    ? "Şimdi Paylaş"
                    : "Önce hesabını bağla"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal title="Paylaşımı Planla" open={Boolean(schedulePreview)} onClose={() => setSchedulePreview(null)}>
        {schedulePreview ? <div className="space-y-4"><div className="rounded-md border border-white/10 bg-zinc-950 p-4"><p className="font-bold text-white">Instagram {statusByPlatform.instagram?.accountUsername ? `@${statusByPlatform.instagram.accountUsername.replace(/^@/, "")}` : ""}</p><p className="mt-2 text-sm text-zinc-400">{displayedMediaPreview?.name}</p><p className="mt-2 line-clamp-2 text-sm text-zinc-300">{schedulePreview.text}</p></div><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold">Tarih ve saat<input type="datetime-local" value={scheduleAt} onChange={(event) => setScheduleAt(event.target.value)} className="mt-2 w-full rounded-md border border-white/10 bg-zinc-950 p-3" /></label><label className="text-sm font-semibold">Timezone<input value={scheduleTimezone} onChange={(event) => setScheduleTimezone(event.target.value)} className="mt-2 w-full rounded-md border border-white/10 bg-zinc-950 p-3" /></label></div><p className="text-sm text-zinc-400">{scheduleAt ? new Date(scheduleAt).toLocaleString("tr-TR") : "Tarih seçilmedi"}</p><div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setSchedulePreview(null)}>Vazgeç</Button><Button onClick={() => void schedulePublish()} disabled={scheduling}>{scheduling ? "Planlanıyor..." : "Planla"}</Button></div></div> : null}
      </Modal>

      <Modal title={connectInfo ? `${connectInfo.label} hesabını bağla` : "Hesabı bağla"} open={Boolean(connectInfo)} onClose={() => setConnectInfo(null)}>
        <div className="space-y-4 text-sm leading-6 text-zinc-300">
          <p>
            Bu bağlantı henüz aktif OAuth akışına bağlı değil. Gerçek paylaşım için önce ilgili platform uygulaması ve kullanıcı hesap bağlantısı kurulmalı.
          </p>
          <div className="rounded-lg border border-white/10 bg-zinc-950 p-4">
            <p className="font-bold text-white">Gereken environment variable isimleri</p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-zinc-400">
              {connectInfo?.requiredEnv.map((name) => (
                <li key={name}>
                  <code className="rounded bg-white/10 px-2 py-1 text-emerald-200">{name}</code>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-zinc-500">
            Anahtar değeri gösterilmez, uydurulmaz ve bu ekrandan dış servise istek atılmaz.
          </p>
        </div>
      </Modal>
    </div>
  );
}
