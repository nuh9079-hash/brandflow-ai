"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, Card, EmptyState } from "@/components/ui";
import type { MediaAsset } from "@/lib/media/types";

type GeneratedImage = {
  media: MediaAsset;
  signedUrl: string;
  prompt: string;
};

type ImageStudioResponse = {
  data?: GeneratedImage;
  error?: string;
};

const styleOptions = [
  "Modern ürün fotoğrafı",
  "Lüks marka görseli",
  "Minimal sosyal medya postu",
  "Canlı renkli reklam kreatifi",
  "Gerçekçi lifestyle çekimi",
  "Editorial kampanya görseli",
];

const ratioOptions = [
  { value: "square", label: "Kare", helper: "1:1 post" },
  { value: "portrait", label: "Dikey", helper: "Story/Reels" },
  { value: "landscape", label: "Yatay", helper: "Kapak" },
];

function safeFilename(name: string) {
  return name.replace(/[^\w.-]+/g, "-") || "brandflow-image.png";
}

export function ImageStudioClient() {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState(styleOptions[0]);
  const [ratio, setRatio] = useState("square");
  const [result, setResult] = useState<GeneratedImage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

  async function generateImage() {
    if (!prompt.trim()) {
      setError("Görsel fikrini yaz.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/image-studio/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, style, ratio }),
      });
      const data = (await response.json()) as ImageStudioResponse;

      if (!response.ok || !data.data) {
        throw new Error(data.error || "Görsel üretilemedi.");
      }

      setResult(data.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setError(message || "Görsel üretilemedi. Lütfen tekrar dene.");
    } finally {
      setLoading(false);
    }
  }

  async function downloadImage() {
    if (!result) return;

    setDownloading(true);

    try {
      const signedResponse = await fetch(`/api/media/${result.media.id}/signed-url`, { method: "POST" });
      const signedJson = (await signedResponse.json()) as { data?: { signedUrl?: string } };
      const signedUrl = signedJson.data?.signedUrl || result.signedUrl;
      const imageResponse = await fetch(signedUrl);

      if (!imageResponse.ok) throw new Error("Download failed.");

      const blob = await imageResponse.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = safeFilename(result.media.name);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      setError("Görsel indirilemedi. Lütfen tekrar dene.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,460px)_1fr]">
      <Card className="p-5">
        <form
          className="grid gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            generateImage();
          }}
        >
          <label className="block text-sm font-semibold text-zinc-200" htmlFor="imagePrompt">
            Görsel fikri
            <textarea
              id="imagePrompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={7}
              placeholder="Örneğin: Siyah oversize tişört için şehir ışıklarında premium bir Instagram reklam görseli"
              className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-zinc-600 focus:border-emerald-300"
            />
          </label>

          <label className="block text-sm font-semibold text-zinc-200" htmlFor="imageStyle">
            Görsel tarzı
            <select
              id="imageStyle"
              value={style}
              onChange={(event) => setStyle(event.target.value)}
              className="mt-2 w-full rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-sm font-semibold text-zinc-100 outline-none transition focus:border-emerald-300"
            >
              {styleOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <div>
            <p className="text-sm font-semibold text-zinc-200">Görsel oranı</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {ratioOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setRatio(option.value)}
                  className={`rounded-lg border p-3 text-left transition ${
                    ratio === option.value
                      ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-100" :"border-white/10 bg-white/[0.03] text-zinc-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span className="block text-sm font-black">{option.label}</span>
                  <span className="mt-1 block text-xs">{option.helper}</span>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm font-semibold text-red-200">
              {error}
            </div>
          )}

          <Button type="submit" disabled={loading} className="py-4 text-base font-black">
            {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-950/30 border-t-zinc-950" />}
            {loading ? "Görsel üretiliyor" : "Görsel Oluştur"}
          </Button>
        </form>
      </Card>

      <div>
        {loading ? (
          <Card className="p-5">
            <div className="aspect-square w-full animate-pulse rounded-lg bg-white/5" />
            <div className="mt-5 space-y-3">
              <div className="h-4 w-2/3 animate-pulse rounded bg-white/10" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-white/10" />
            </div>
          </Card>
        ) : result ? (
          <Card className="overflow-hidden">
            <div className="bg-zinc-950">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={result.signedUrl} alt={result.media.name} className="max-h-[720px] w-full object-contain" />
            </div>
            <div className="p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Medya Merkezine kaydedildi</p>
                  <h2 className="mt-2 text-xl font-black text-white">{result.media.name}</h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">{result.prompt}</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                  <Button type="button" onClick={downloadImage} disabled={downloading}>
                    {downloading ? "İndiriliyor" : "İndir"}
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
            title="Henüz görsel yok"
            description="Sol taraftaki fikri yazıp görsel oluşturduğunda sonuç burada görünecek ve otomatik olarak Medya Merkezi'ne kaydedilecek."
          />
        )}
      </div>
    </div>
  );
}
