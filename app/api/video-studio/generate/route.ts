import { auth } from "@clerk/nextjs/server";
import Groq from "groq-sdk";
import { createMedia, deleteMedia, getMedia, updateMediaStorage } from "@/lib/media/server";
import { createSignedMediaUrl, createUploadPath } from "@/lib/media/storage";
import { mediaBucketName, type MediaAsset } from "@/lib/media/types";
import { mediaLimitForType } from "@/lib/media/validation";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type VideoStatus = "preparing" | "submitting" | "processing" | "completed" | "failed";
type VideoStyle = "Cinematic" | "Funny" | "Product Promotion" | "Social Media" | "Realistic";
type VideoAspectRatio = "9:16" | "1:1" | "16:9";

type VideoStudioBody = {
  prompt?: unknown;
  sourceMediaId?: unknown;
  aspectRatio?: unknown;
  duration?: unknown;
  style?: unknown;
};

type VideoSource = {
  media: MediaAsset;
  signedUrl: string;
};

type SubmittedVideoJob = {
  jobId: string;
  status: VideoStatus;
};

type PolledVideoJob = {
  jobId: string;
  status: VideoStatus;
  outputUrl?: string;
  error?: string;
};

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const videoStyles = new Set<VideoStyle>(["Cinematic", "Funny", "Product Promotion", "Social Media", "Realistic"]);
const aspectRatios: Record<VideoAspectRatio, { providerRatio: string; width: number; height: number }> = {
  "9:16": { providerRatio: "720:1280", width: 720, height: 1280 },
  "1:1": { providerRatio: "960:960", width: 960, height: 960 },
  "16:9": { providerRatio: "1280:720", width: 1280, height: 720 },
};
const defaultRunwayDurations = [5, 10] as const;

function videoError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

function safeText(value: unknown, maxLength = 1200) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function safeInteger(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isInteger(parsed) ? parsed : 0;
}

function parseAspectRatio(value: unknown): VideoAspectRatio {
  return value === "1:1" || value === "16:9" ? value : "9:16";
}

function parseStyle(value: unknown): VideoStyle {
  return typeof value === "string" && videoStyles.has(value as VideoStyle) ? (value as VideoStyle) : "Social Media";
}

function parseSourceMediaId(value: unknown) {
  const text = safeText(value, 100);
  return text || null;
}

function getRunwayDurations() {
  const configured = process.env.RUNWAY_VIDEO_DURATIONS;
  if (!configured) return [...defaultRunwayDurations];

  const durations = configured
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => value === 5 || value === 10 || value === 15);

  return Array.from(new Set(durations)).sort((first, second) => first - second);
}

function getVideoProvider() {
  const apiKey = process.env.RUNWAY_API_KEY;
  const supportedDurations = getRunwayDurations();

  return {
    id: "runway",
    name: "Runway",
    configured: Boolean(apiKey),
    apiKey,
    baseUrl: process.env.RUNWAY_API_BASE_URL || "https://api.dev.runwayml.com/v1",
    apiVersion: process.env.RUNWAY_API_VERSION || "2024-11-06",
    model: process.env.RUNWAY_VIDEO_MODEL || "gen4_turbo",
    supportedDurations,
  };
}

function providerHeaders(provider: ReturnType<typeof getVideoProvider>) {
  return {
    Authorization: `Bearer ${provider.apiKey}`,
    "Content-Type": "application/json",
    "X-Runway-Version": provider.apiVersion,
  };
}

function filenameFromPrompt(prompt: string) {
  const slug = prompt
    .toLocaleLowerCase("tr-TR")
    .replace(/[^a-z0-9ğüşöçıİĞÜŞÖÇ\s-]/gi, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 56);

  return `${slug || "brandflow-video"}-${Date.now()}.mp4`;
}

async function buildVideoPrompt(prompt: string, style: VideoStyle, aspectRatio: VideoAspectRatio, duration: number, source: VideoSource | null) {
  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content:
            "You are an expert creative director for AI video generation. Return only one polished English video generation prompt. No markdown, no explanations.",
        },
        {
          role: "user",
          content: `Create a production-ready AI video prompt.
Main idea: ${prompt}
Style: ${style}
Aspect ratio: ${aspectRatio}
Duration: ${duration} seconds
Source media: ${source ? `${source.media.type} named ${source.media.name}` : "none"}
Requirements: clear motion direction, social-media-ready composition, realistic camera movement, brand-safe content, no text overlays unless explicitly requested.`,
        },
      ],
      max_completion_tokens: 320,
    });

    return completion.choices[0]?.message?.content?.trim() || prompt;
  } catch {
    return `${prompt}. Style: ${style}. ${duration} second ${aspectRatio} social media video with clear camera movement and polished lighting.`;
  }
}

async function getSourceMedia(userId: string, mediaId: string | null): Promise<VideoSource | null> {
  if (!mediaId) return null;

  const media = await getMedia(userId, mediaId);
  if (!media.ok) {
    throw new Error("Seçilen medya bulunamadı.");
  }

  if (media.data.type !== "image" && media.data.type !== "video") {
    throw new Error("Video için yalnızca görsel veya video kaynak seçebilirsin.");
  }

  if (!media.data.storagePath) {
    throw new Error("Seçilen medyanın dosya bağlantısı hazır değil.");
  }

  const signed = await createSignedMediaUrl(userId, media.data.storagePath);
  if (!signed.ok) {
    throw new Error("Seçilen medya için güvenli bağlantı oluşturulamadı.");
  }

  return {
    media: media.data,
    signedUrl: signed.data.signedUrl,
  };
}

async function submitRunwayJob(input: {
  prompt: string;
  aspectRatio: VideoAspectRatio;
  duration: number;
  source: VideoSource | null;
}): Promise<SubmittedVideoJob> {
  const provider = getVideoProvider();
  if (!provider.configured || !provider.apiKey) {
    throw new Error("Video üretimi için gerçek sağlayıcı bağlı değil. RUNWAY_API_KEY ortam değişkenini eklemelisin.");
  }

  const ratio = aspectRatios[input.aspectRatio];
  const endpoint = input.source
    ? input.source.media.type === "video"
      ? "video_to_video"
      : "image_to_video"
    : "text_to_video";
  const sourcePayload =
    input.source?.media.type === "video"
      ? { promptVideo: input.source.signedUrl }
      : input.source?.media.type === "image"
        ? { promptImage: input.source.signedUrl }
        : {};

  const response = await fetch(`${provider.baseUrl}/${endpoint}`, {
    method: "POST",
    headers: providerHeaders(provider),
    body: JSON.stringify({
      model: provider.model,
      promptText: input.prompt,
      ratio: ratio.providerRatio,
      duration: input.duration,
      ...sourcePayload,
    }),
  });

  if (!response.ok) {
    throw new Error("Video sağlayıcısı isteği kabul etmedi. API anahtarı, model ve hesap limitlerini kontrol et.");
  }

  const json = (await response.json()) as { id?: string; taskId?: string; status?: string };
  const jobId = json.id || json.taskId;

  if (!jobId) {
    throw new Error("Video sağlayıcısı job ID döndürmedi.");
  }

  return {
    jobId,
    status: normalizeProviderStatus(json.status),
  };
}

function normalizeProviderStatus(status: unknown): VideoStatus {
  const value = typeof status === "string" ? status.toLowerCase() : "";

  if (["succeeded", "success", "completed", "complete"].includes(value)) return "completed";
  if (["failed", "failure", "cancelled", "canceled"].includes(value)) return "failed";
  if (["pending", "queued", "submitted", "starting"].includes(value)) return "submitting";
  return "processing";
}

async function pollRunwayJob(jobId: string): Promise<PolledVideoJob> {
  const provider = getVideoProvider();
  if (!provider.configured || !provider.apiKey) {
    throw new Error("Video üretimi için gerçek sağlayıcı bağlı değil. RUNWAY_API_KEY ortam değişkenini eklemelisin.");
  }

  const response = await fetch(`${provider.baseUrl}/tasks/${encodeURIComponent(jobId)}`, {
    method: "GET",
    headers: providerHeaders(provider),
  });

  if (!response.ok) {
    throw new Error("Video durumu alınamadı. Sağlayıcı ayarlarını kontrol et.");
  }

  const json = (await response.json()) as {
    id?: string;
    status?: string;
    output?: string | string[] | Array<{ url?: string }>;
    error?: string;
    failure?: string;
  };
  const status = normalizeProviderStatus(json.status);
  const rawOutput = Array.isArray(json.output) ? json.output[0] : json.output;
  const outputUrl = typeof rawOutput === "string" ? rawOutput : rawOutput?.url;

  return {
    jobId: json.id || jobId,
    status,
    outputUrl,
    error: json.error || json.failure,
  };
}

async function downloadVideo(videoUrl: string) {
  const response = await fetch(videoUrl);

  if (!response.ok) {
    throw new Error("Video dosyası indirilemedi.");
  }

  const contentLength = Number(response.headers.get("content-length") || 0);
  const videoLimit = mediaLimitForType("video");

  if (contentLength > videoLimit) {
    throw new Error("Üretilen video Medya Merkezi sınırını aşıyor.");
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  if (buffer.byteLength > videoLimit) {
    throw new Error("Üretilen video Medya Merkezi sınırını aşıyor.");
  }

  return {
    buffer,
    mimeType: response.headers.get("content-type")?.split(";")[0] || "video/mp4",
  };
}

async function saveGeneratedVideo(userId: string, input: {
  videoUrl: string;
  prompt: string;
  aspectRatio: VideoAspectRatio;
  duration: number;
}) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Medya depolama yapılandırılmadı.");
  }

  const ratio = aspectRatios[input.aspectRatio];
  const video = await downloadVideo(input.videoUrl);
  const filename = filenameFromPrompt(input.prompt);
  let mediaId = "";

  try {
    const created = await createMedia(userId, {
      type: "video",
      name: filename,
      mimeType: video.mimeType.startsWith("video/") ? video.mimeType : "video/mp4",
      size: video.buffer.byteLength,
      width: ratio.width,
      height: ratio.height,
      duration: input.duration,
    });

    if (!created.ok) {
      throw new Error("Video medya kaydı oluşturulamadı.");
    }

    mediaId = created.data.id;
    const storagePath = createUploadPath(userId, mediaId, filename);
    const uploaded = await supabase.storage.from(mediaBucketName).upload(storagePath, video.buffer, {
      contentType: "video/mp4",
      upsert: true,
    });

    if (uploaded.error) {
      throw new Error("Video Medya Merkezine kaydedilemedi.");
    }

    const stored = await updateMediaStorage(userId, mediaId, storagePath);

    if (!stored.ok) {
      await supabase.storage.from(mediaBucketName).remove([storagePath]);
      throw new Error("Video Medya Merkezi kaydı tamamlanamadı.");
    }

    const signed = await createSignedMediaUrl(userId, storagePath);

    if (!signed.ok) {
      throw new Error("Video önizleme bağlantısı oluşturulamadı.");
    }

    return {
      media: stored.data,
      signedUrl: signed.data.signedUrl,
    };
  } catch (error) {
    if (mediaId) {
      await deleteMedia(userId, mediaId);
    }

    throw error;
  }
}

export async function GET(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return videoError("Video Studio için giriş yapmalısın.", 401);
  }

  const provider = getVideoProvider();
  const url = new URL(req.url);
  const jobId = safeText(url.searchParams.get("jobId"), 160);

  if (!jobId) {
    return Response.json({
      data: {
        provider: provider.name,
        configured: provider.configured,
        supportedDurations: provider.supportedDurations,
        supportedAspectRatios: Object.keys(aspectRatios),
        styles: Array.from(videoStyles),
        message: provider.configured
          ? ""
          : "Video üretimi için RUNWAY_API_KEY ortam değişkeni eksik. Anahtar eklenmeden gerçek video üretilemez.",
      },
    });
  }

  const prompt = safeText(url.searchParams.get("prompt"));
  const aspectRatio = parseAspectRatio(url.searchParams.get("aspectRatio"));
  const duration = safeInteger(url.searchParams.get("duration")) || provider.supportedDurations[0] || 5;

  try {
    const job = await pollRunwayJob(jobId);

    if (job.status === "failed") {
      return Response.json({
        data: {
          status: "failed" satisfies VideoStatus,
          jobId,
          error: job.error || "Video üretimi başarısız oldu.",
        },
      });
    }

    if (job.status !== "completed") {
      return Response.json({
        data: {
          status: job.status,
          jobId,
        },
      });
    }

    if (!job.outputUrl) {
      return videoError("Video tamamlandı ama sağlayıcı video bağlantısı döndürmedi.", 502);
    }

    const saved = await saveGeneratedVideo(userId, {
      videoUrl: job.outputUrl,
      prompt: prompt || "brandflow-video",
      aspectRatio,
      duration,
    });

    return Response.json({
      data: {
        status: "completed" satisfies VideoStatus,
        jobId,
        media: saved.media,
        signedUrl: saved.signedUrl,
        prompt,
      },
    });
  } catch (error) {
    return videoError(error instanceof Error ? error.message : "Video durumu alınamadı.", 500);
  }
}

export async function POST(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return videoError("Video üretmek için giriş yapmalısın.", 401);
  }

  const provider = getVideoProvider();

  if (!provider.configured) {
    return videoError(
      "Video üretimi için gerçek sağlayıcı bağlı değil. RUNWAY_API_KEY ortam değişkeni eksik olduğu için video üretimi başlatılamaz.",
      503,
    );
  }

  const body = (await req.json()) as VideoStudioBody;
  const prompt = safeText(body.prompt);
  const aspectRatio = parseAspectRatio(body.aspectRatio);
  const duration = safeInteger(body.duration);
  const style = parseStyle(body.style);

  if (!prompt) {
    return videoError("Video fikrini yazmalısın.", 400);
  }

  if (!provider.supportedDurations.some((supportedDuration) => supportedDuration === duration)) {
    return videoError("Seçilen süre bu video sağlayıcısı tarafından desteklenmiyor.", 400);
  }

  try {
    const source = await getSourceMedia(userId, parseSourceMediaId(body.sourceMediaId));
    const enhancedPrompt = await buildVideoPrompt(prompt, style, aspectRatio, duration, source);
    const job = await submitRunwayJob({
      prompt: enhancedPrompt,
      aspectRatio,
      duration,
      source,
    });

    return Response.json({
      data: {
        status: job.status,
        jobId: job.jobId,
        provider: provider.name,
        prompt: enhancedPrompt,
      },
    });
  } catch (error) {
    return videoError(error instanceof Error ? error.message : "Video üretimi başlatılamadı.", 500);
  }
}
