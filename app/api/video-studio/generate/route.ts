import { auth } from "@clerk/nextjs/server";
import Groq from "groq-sdk";
import { createMedia, deleteMedia, getMedia, updateMediaStorage } from "@/lib/media/server";
import { createSignedMediaUrl, createUploadPath, deleteStoredFile } from "@/lib/media/storage";
import { mediaBucketName } from "@/lib/media/types";
import { mediaLimitForType } from "@/lib/media/validation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { checkUsage, recordUsage } from "@/lib/billing/server";
import { createVideoJob, getVideoJob, updateVideoJob } from "@/lib/video/jobs";
import {
  aspectRatios,
  getVideoProvider,
  missingRunwayKeyMessage,
  pollVideoJob,
  RunwayProviderError,
  submitVideoJob,
  videoStyles,
  type VideoAspectRatio,
  type VideoSource,
  type VideoStatus,
  type VideoStyle,
} from "@/lib/video/provider";

export const runtime = "nodejs";

type VideoStudioBody = {
  prompt?: unknown;
  sourceMediaId?: unknown;
  aspectRatio?: unknown;
  duration?: unknown;
  style?: unknown;
};

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

function videoError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

function runwayErrorResponse(error: unknown, fallbackMessage: string, context?: {
  model?: string;
  duration?: number;
  ratio?: string;
}) {
  if (error instanceof RunwayProviderError) {
    console.error("Runway HTTP status:", error.details.httpStatus);
    console.error("Runway response body:", error.details.responseBody);
    console.error("Runway error code:", error.details.code);
    console.error("Runway error message:", error.message);
    console.error("Runway request endpoint:", error.details.endpoint);
    console.error("Runway selected model:", error.details.model || context?.model || null);
    console.error("Runway submitted duration:", error.details.duration ?? context?.duration ?? null);
    console.error("Runway submitted ratio:", error.details.ratio || context?.ratio || null);

    return videoError(
      process.env.NODE_ENV === "development" ? error.message : "Video sağlayıcısı isteği tamamlayamadı.",
      502,
    );
  }

  console.error("Video Studio Error:", error instanceof Error ? error.message : error);
  return videoError(fallbackMessage, 500);
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

function filenameFromPrompt(prompt: string) {
  const slug = prompt
    .toLocaleLowerCase("tr-TR")
    .replace(/[^a-z0-9ğüşıöçİĞÜŞÖÇ\s-]/gi, "")
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
          : missingRunwayKeyMessage,
      },
    });
  }

  let pollContext: { duration?: number; ratio?: string } = {};
  try {
    const storedJob = await getVideoJob(userId, jobId);
    if (!storedJob.ok) return videoError(storedJob.error, storedJob.status);
    pollContext = {
      duration: storedJob.data.duration,
      ratio: aspectRatios[storedJob.data.aspectRatio].providerRatio,
    };

    if (storedJob.data.status === "completed" && storedJob.data.mediaAssetId) {
      const media = await getMedia(userId, storedJob.data.mediaAssetId);
      if (!media.ok || !media.data.storagePath) return videoError("Tamamlanan video kaydı bulunamadı.", 404);
      const signed = await createSignedMediaUrl(userId, media.data.storagePath);
      if (!signed.ok) return videoError(signed.error, signed.status);
      return Response.json({ data: { status: "completed", jobId, media: media.data, signedUrl: signed.data.signedUrl, prompt: storedJob.data.prompt } });
    }

    const job = await pollVideoJob(jobId);

    if (job.status === "failed") {
      await updateVideoJob(userId, jobId, { status: "failed", error: job.error || "Video üretimi başarısız oldu." });
      return Response.json({
        data: {
          status: "failed" satisfies VideoStatus,
          jobId,
          error: job.error || "Video üretimi başarısız oldu.",
        },
      });
    }

    if (job.status !== "completed") {
      await updateVideoJob(userId, jobId, { status: job.status });
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
      prompt: storedJob.data.prompt,
      aspectRatio: storedJob.data.aspectRatio,
      duration: storedJob.data.duration,
    });

    const usage = await recordUsage(userId, "ai_videos", `video:${jobId}`);
    if (!usage.ok) {
      if (saved.media.storagePath) await deleteStoredFile(userId, saved.media.storagePath);
      await deleteMedia(userId, saved.media.id);
      return videoError(usage.error, usage.status);
    }
    await updateVideoJob(userId, jobId, { status: "completed", mediaAssetId: saved.media.id });

    return Response.json({
      data: {
        status: "completed" satisfies VideoStatus,
        jobId,
        media: saved.media,
        signedUrl: saved.signedUrl,
        prompt: storedJob.data.prompt,
      },
    });
  } catch (error) {
    return runwayErrorResponse(error, "Video durumu alınamadı.", pollContext);
  }
}

export async function POST(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return videoError("Video üretmek için giriş yapmalısın.", 401);
  }

  const usageAccess = await checkUsage(userId, "ai_videos");
  if (!usageAccess.ok) return videoError(usageAccess.error, usageAccess.status);

  const provider = getVideoProvider();

  if (!provider.configured) {
    return videoError(
      missingRunwayKeyMessage,
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
    const job = await submitVideoJob({
      prompt: enhancedPrompt,
      aspectRatio,
      duration,
      source,
    });
    const stored = await createVideoJob(userId, {
      provider: provider.name,
      providerJobId: job.jobId,
      status: job.status,
      prompt: enhancedPrompt,
      aspectRatio,
      duration,
    });
    if (!stored.ok) return videoError(stored.error, 500);

    return Response.json({
      data: {
        status: job.status,
        jobId: job.jobId,
        provider: provider.name,
        prompt: enhancedPrompt,
      },
    });
  } catch (error) {
    return runwayErrorResponse(error, "Video üretimi başlatılamadı.", {
      duration,
      ratio: aspectRatios[aspectRatio].providerRatio,
    });
  }
}

