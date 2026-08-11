"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useMemo, useState } from "react";
import { Button, Card, EmptyState, Modal } from "@/components/ui";
import { mergeGeneratedContents, readCachedGeneratedContents } from "@/lib/client-content-cache";
import type { GeneratedContentRecord } from "@/lib/content-store";
import type { SocialPlatform, SocialProviderStatus } from "@/lib/social/types";

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

type PublishCenterClientProps = {
  initialItems: GeneratedContentRecord[];
  providerStatuses: SocialProviderStatus[];
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

export function PublishCenterClient({ initialItems, providerStatuses }: PublishCenterClientProps) {
  const [items, setItems] = useState(initialItems);
  const [selectedId, setSelectedId] = useState(initialItems[0]?.id ?? "");
  const [prepared, setPrepared] = useState(false);
  const [message, setMessage] = useState("");
  const [connectInfo, setConnectInfo] = useState<SocialProviderStatus | null>(null);
  const { user } = useUser();

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedId) ?? items[0] ?? null,
    [items, selectedId]
  );
  const visiblePlatforms = useMemo(
    () => (selectedItem ? selectedPublishPlatforms(selectedItem) : []),
    [selectedItem]
  );
  const previews = useMemo(
    () => (selectedItem ? visiblePlatforms.map((platform) => createPreview(platform, selectedItem)) : []),
    [selectedItem, visiblePlatforms]
  );
  const statusByPlatform = useMemo(
    () => Object.fromEntries(providerStatuses.map((status) => [status.platform, status])),
    [providerStatuses]
  ) as Record<SocialPlatform, SocialProviderStatus | undefined>;

  useEffect(() => {
    if (!user?.id) return;

    const timer = window.setTimeout(() => {
      setItems(mergeGeneratedContents(initialItems, readCachedGeneratedContents(user.id)));
    }, 0);

    return () => window.clearTimeout(timer);
  }, [initialItems, user?.id]);

  function selectContent(id: string) {
    setSelectedId(id);
    setPrepared(false);
    setMessage("");
  }

  function connectAccount(status: SocialProviderStatus) {
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

  function publishNow(preview: PreparedPreview) {
    const status = statusByPlatform[preview.platform.provider];
    setMessage(status?.connected ? "Paylaşım isteği hazırlanıyor." : `${preview.platform.label} için önce hesabını bağla.`);
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="Paylaşılacak içerik yok"
        description="Önce ana ekrandan bir içerik üret. Oluşturulan içerikler burada paylaşım için hazırlanacak."
      />
    );
  }

  return (
    <div className="space-y-5">
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
        {message && (
          <div className="mt-4 rounded-lg border border-emerald-400/20 bg-emerald-400/5 p-3 text-sm text-emerald-100">
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
            <div key={status.platform} className="rounded-lg border border-white/10 bg-zinc-950/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-white text-xs font-black text-zinc-950">
                    {status.label === "X" ? "X" : status.label.slice(0, 2)}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-white">{status.label}</p>
                    <p className="text-xs text-zinc-500">{status.connected ? "Bağlı" : status.configured ? "OAuth hazır" : "Bağlanmadı"}</p>
                  </div>
                </div>
                <span className={`rounded-full px-2 py-1 text-xs font-bold ${status.connected ? "bg-emerald-400 text-zinc-950" : "bg-white/10 text-zinc-400"}`}>
                  {status.connected ? "Aktif" : status.configured ? "Hazır" : "Pasif"}
                </span>
              </div>
              <p className="mt-3 text-xs leading-5 text-zinc-500">{status.message}</p>
              <Button type="button" variant="secondary" onClick={() => connectAccount(status)} className="mt-4 w-full px-3 py-2 text-xs">
                {status.platform === "instagram" && status.configured ? "Instagram ile bağlan" : "Hesabı Bağla"}
              </Button>
            </div>
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
          const hashtags = preview.hashtags.length > 0 ? preview.hashtags.join(" ") : "Hashtag bulunamadı.";

          return (
            <Card key={preview.platform.key} className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-lg bg-white text-sm font-black text-zinc-950">
                    {preview.platform.icon}
                  </span>
                  <div>
                    <h3 className="text-lg font-black text-white">{preview.platform.label}</h3>
                    <p className="text-sm text-zinc-500">{preview.characterCount} karakter</p>
                  </div>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${prepared ? "bg-emerald-400 text-zinc-950" : "bg-white/10 text-zinc-400"}`}>
                  {prepared ? "Hazır" : "Taslak"}
                </span>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[180px_1fr]">
                <div className="rounded-lg border border-white/10 bg-zinc-950 p-3">
                  <div
                    className="flex aspect-[4/5] items-center justify-center rounded-md border border-white/10 bg-[#101013] p-3 text-center text-xs leading-5 text-zinc-500"
                    aria-label={`${preview.platform.label} görsel önizleme`}
                  >
                    {preview.visualPrompt}
                  </div>
                  <Button type="button" variant="secondary" onClick={() => downloadVisual(preview)} className="mt-3 w-full px-3 py-2 text-xs">
                    Görsel indir
                  </Button>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Metin</p>
                    <p className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-zinc-950 p-3 text-sm leading-6 text-zinc-300">
                      {preview.text}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Hashtag</p>
                    <p className="mt-2 rounded-lg bg-zinc-950 p-3 text-sm leading-6 text-zinc-300">{hashtags}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Video fikri veya senaryo</p>
                    <p className="mt-2 rounded-lg bg-zinc-950 p-3 text-sm leading-6 text-zinc-300">
                      {preview.videoIdea || "Bu platform için ayrı video fikri bulunamadı."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Button type="button" variant="secondary" onClick={() => copyPreview(preview)} disabled={!prepared}>
                  Metni kopyala
                </Button>
                <Button type="button" variant="secondary" onClick={() => downloadText(preview)} disabled={!prepared}>
                  İçeriği indir
                </Button>
                <Button type="button" onClick={() => publishNow(preview)} disabled={!status?.connected}>
                  {status?.connected ? "Şimdi Paylaş" : "Önce hesabını bağla"}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
      )}

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
