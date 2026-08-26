import { auth } from "@clerk/nextjs/server";
import Groq from "groq-sdk";
import { createMedia, deleteMedia, getMedia, updateMediaStorage } from "@/lib/media/server";
import { createSignedMediaUrl, createUploadPath } from "@/lib/media/storage";
import { mediaBucketName } from "@/lib/media/types";
import { mediaLimitForType } from "@/lib/media/validation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  aspectRatios,
  getVideoProvider,
  pollVideoJob,
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
    .replace(/[^a-z0-9ÄŸÃ¼ÅŸÃ¶Ã§Ä±Ä°ÄÃœÅÃ–Ã‡\s-]/gi, "")
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
    throw new Error("SeÃ§ilen medya bulunamadÄ±.");
  }

  if (media.data.type !== "image" && media.data.type !== "video") {
    throw new Error("Video iÃ§in yalnÄ±zca gÃ¶rsel veya video kaynak seÃ§ebilirsin.");
  }

  if (!media.data.storagePath) {
    throw new Error("SeÃ§ilen medyanÄ±n dosya baÄŸlantÄ±sÄ± hazÄ±r deÄŸil.");
  }

  const signed = await createSignedMediaUrl(userId, media.data.storagePath);
  if (!signed.ok) {
    throw new Error("SeÃ§ilen medya iÃ§in gÃ¼venli baÄŸlantÄ± oluÅŸturulamadÄ±.");
  }

  return {
    media: media.data,
    signedUrl: signed.data.signedUrl,
  };
}

async function downloadVideo(videoUrl: string) {
  const response = await fetch(videoUrl);

  if (!response.ok) {
    throw new Error("Video dosyasÄ± indirilemedi.");
  }

  const contentLength = Number(response.headers.get("content-length") || 0);
  const videoLimit = mediaLimitForType("video");

  if (contentLength > videoLimit) {
    throw new Error("Ãœretilen video Medya Merkezi sÄ±nÄ±rÄ±nÄ± aÅŸÄ±yor.");
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  if (buffer.byteLength > videoLimit) {
    throw new Error("Ãœretilen video Medya Merkezi sÄ±nÄ±rÄ±nÄ± aÅŸÄ±yor.");
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
    throw new Error("Medya depolama yapÄ±landÄ±rÄ±lmadÄ±.");
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
      throw new Error("Video medya kaydÄ± oluÅŸturulamadÄ±.");
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
      throw new Error("Video Medya Merkezi kaydÄ± tamamlanamadÄ±.");
    }

    const signed = await createSignedMediaUrl(userId, storagePath);

    if (!signed.ok) {
      throw new Error("Video Ã¶nizleme baÄŸlantÄ±sÄ± oluÅŸturulamadÄ±.");
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
    return videoError("Video Studio iÃ§in giriÅŸ yapmalÄ±sÄ±n.", 401);
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
          ? "" :"Video Ã¼retimi iÃ§in RUNWAY_API_KEY ortam deÄŸiÅŸkeni eksik. Anahtar eklenmeden gerÃ§ek video Ã¼retilemez.",
      },
    });
  }

  const prompt = safeText(url.searchParams.get("prompt"));
  const aspectRatio = parseAspectRatio(url.searchParams.get("aspectRatio"));
  const duration = safeInteger(url.searchParams.get("duration")) || provider.supportedDurations[0] || 5;

  try {
    const job = await pollVideoJob(jobId);

    if (job.status === "failed") {
      return Response.json({
        data: {
          status: "failed" satisfies VideoStatus,
          jobId,
          error: job.error || "Video Ã¼retimi baÅŸarÄ±sÄ±z oldu.",
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
      return videoError("Video tamamlandÄ± ama saÄŸlayÄ±cÄ± video baÄŸlantÄ±sÄ± dÃ¶ndÃ¼rmedi.", 502);
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
    return videoError(error instanceof Error ? error.message : "Video durumu alÄ±namadÄ±.", 500);
  }
}

export async function POST(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return videoError("Video Ã¼retmek iÃ§in giriÅŸ yapmalÄ±sÄ±n.", 401);
  }

  const provider = getVideoProvider();

  if (!provider.configured) {
    return videoError(
      "Video Ã¼retimi iÃ§in gerÃ§ek saÄŸlayÄ±cÄ± baÄŸlÄ± deÄŸil. RUNWAY_API_KEY ortam deÄŸiÅŸkeni eksik olduÄŸu iÃ§in video Ã¼retimi baÅŸlatÄ±lamaz.",
      503,
    );
  }

  const body = (await req.json()) as VideoStudioBody;
  const prompt = safeText(body.prompt);
  const aspectRatio = parseAspectRatio(body.aspectRatio);
  const duration = safeInteger(body.duration);
  const style = parseStyle(body.style);

  if (!prompt) {
    return videoError("Video fikrini yazmalÄ±sÄ±n.", 400);
  }

  if (!provider.supportedDurations.some((supportedDuration) => supportedDuration === duration)) {
    return videoError("SeÃ§ilen sÃ¼re bu video saÄŸlayÄ±cÄ±sÄ± tarafÄ±ndan desteklenmiyor.", 400);
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

    return Response.json({
      data: {
        status: job.status,
        jobId: job.jobId,
        provider: provider.name,
        prompt: enhancedPrompt,
      },
    });
  } catch (error) {
    return videoError(error instanceof Error ? error.message : "Video Ã¼retimi baÅŸlatÄ±lamadÄ±.", 500);
  }
}

