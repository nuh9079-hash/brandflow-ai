import { auth } from "@clerk/nextjs/server";
import { GoogleGenAI, Modality } from "@google/genai";
import { createMedia, deleteMedia, updateMediaStorage } from "@/lib/media/server";
import { createSignedMediaUrl, createUploadPath } from "@/lib/media/storage";
import { mediaBucketName } from "@/lib/media/types";
import { mediaLimitForType } from "@/lib/media/validation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { checkUsage, recordUsage } from "@/lib/billing/server";

export const runtime = "nodejs";

type ImageStudioBody = {
  prompt?: unknown;
  style?: unknown;
  ratio?: unknown;
};

type VertexImageResult = {
  buffer: Buffer;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
};

const vertexImageModel = "gemini-2.5-flash-image";
const supportedImageMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const ratioSettings = {
  square: { aspectRatio: "1:1", width: 1024, height: 1024 },
  portrait: { aspectRatio: "9:16", width: 1080, height: 1920 },
  landscape: { aspectRatio: "16:9", width: 1920, height: 1080 },
} as const;

function safeText(value: unknown, maxLength = 1200) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function imageError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

function filenameExtension(mimeType: VertexImageResult["mimeType"]) {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

function filenameFromPrompt(prompt: string, mimeType: VertexImageResult["mimeType"]) {
  const slug = prompt
    .toLocaleLowerCase("tr-TR")
    .replace(/[^a-z0-9ğüşöçıİĞÜŞÖÇ\s-]/gi, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 56);

  return `${slug || "brandflow-image"}-${Date.now()}.${filenameExtension(mimeType)}`;
}

function buildImagePrompt(prompt: string, style: string, ratioKey: keyof typeof ratioSettings) {
  const ratio = ratioSettings[ratioKey];
  const ratioLabel = ratioKey === "portrait" ? "vertical social story/reels" : ratioKey === "landscape" ? "landscape cover" : "square social post";

  return [
    "Create one production-ready social media image.",
    `Main idea: ${prompt}`,
    `Visual style: ${style || "modern social media creative"}`,
    `Format: ${ratio.aspectRatio} ${ratioLabel}.`,
    "Requirements: no text overlays unless explicitly requested, clear subject, commercial lighting, polished composition, brand-safe content, high quality output.",
  ].join("\n");
}

function sanitizeProviderError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  const sanitized = message
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [GOOGLE_ACCESS_TOKEN]")
    .replace(/ya29\.[A-Za-z0-9._-]+/g, "[GOOGLE_ACCESS_TOKEN]")
    .replace(/authorization[:=]\s*([^\s,}]+)/gi, "authorization=[REDACTED]")
    .slice(0, 700);

  return sanitized || "Sağlayıcı ayrıntı vermedi.";
}

function getVertexConfig() {
  const project = safeText(process.env.GOOGLE_CLOUD_PROJECT, 140);
  const location = safeText(process.env.GOOGLE_CLOUD_LOCATION, 80);

  if (!project) {
    throw new Error("CONFIG_MISSING:GOOGLE_CLOUD_PROJECT");
  }

  if (!location) {
    throw new Error("CONFIG_MISSING:GOOGLE_CLOUD_LOCATION");
  }

  return { project, location };
}

function detectImageMime(buffer: Buffer, declaredMime: unknown): VertexImageResult["mimeType"] | null {
  const declared = typeof declaredMime === "string" ? declaredMime.toLowerCase() : "";

  if (supportedImageMimeTypes.has(declared)) {
    return declared as VertexImageResult["mimeType"];
  }

  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }
  if (buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") {
    return "image/webp";
  }

  return null;
}

async function generateVertexImage(prompt: string): Promise<VertexImageResult> {
  const { project, location } = getVertexConfig();
  const ai = new GoogleGenAI({
    vertexai: true,
    project,
    location,
  });

  let response;

  try {
    response = await ai.models.generateContent({
      model: vertexImageModel,
      contents: prompt,
      config: {
        responseModalities: [Modality.TEXT, Modality.IMAGE],
      },
    });
  } catch (error) {
    console.error("Vertex AI Error:", error);
    if (error instanceof Error && error.stack) {
      console.error("Vertex AI Error Stack:", error.stack);
    }
    throw new Error(`PROVIDER_ERROR:${sanitizeProviderError(error)}`);
  }

  const parts = response.candidates?.flatMap((candidate) => candidate.content?.parts ?? []) ?? [];
  const imagePart = parts.find((part) => Boolean(part.inlineData?.data));
  const base64Image = imagePart?.inlineData?.data;

  if (!base64Image) {
    throw new Error("Vertex AI görsel verisi döndürmedi.");
  }

  const buffer = Buffer.from(base64Image, "base64");
  const mimeType = detectImageMime(buffer, imagePart?.inlineData?.mimeType);

  if (!mimeType) {
    throw new Error("Vertex AI desteklenen bir görsel türü döndürmedi.");
  }

  if (buffer.byteLength <= 0) {
    throw new Error("Vertex AI boş görsel verisi döndürdü.");
  }

  if (buffer.byteLength > mediaLimitForType("image")) {
    throw new Error("Vertex AI görseli Medya Merkezi dosya sınırını aşıyor.");
  }

  return {
    buffer,
    mimeType,
  };
}

function publicImageError(error: unknown) {
  const message = error instanceof Error ? error.message : "";

  if (message === "CONFIG_MISSING:GOOGLE_CLOUD_PROJECT") {
    return imageError("Vertex AI görsel üretimi için GOOGLE_CLOUD_PROJECT yapılandırılmamış.", 503);
  }

  if (message === "CONFIG_MISSING:GOOGLE_CLOUD_LOCATION") {
    return imageError("Vertex AI görsel üretimi için GOOGLE_CLOUD_LOCATION yapılandırılmamış.", 503);
  }

  if (message.startsWith("PROVIDER_ERROR:")) {
    const providerMessage = message.replace("PROVIDER_ERROR:", "");
    const normalized = providerMessage.toLocaleLowerCase("tr-TR");

    if (
      normalized.includes("could not load the default credentials") ||
      normalized.includes("application default credentials") ||
      normalized.includes("unauthenticated") ||
      normalized.includes("permission denied") ||
      normalized.includes("credential") ||
      normalized.includes("401") ||
      normalized.includes("403")
    ) {
      return imageError(
        `Vertex AI kimlik doğrulaması başarısız. Google Cloud kimlik bilgilerini ve servis hesabı yetkilerini kontrol et. Sağlayıcı mesajı: ${providerMessage}`,
        401,
      );
    }

    if (
      normalized.includes("quota") ||
      normalized.includes("resource exhausted") ||
      normalized.includes("rate limit") ||
      normalized.includes("429")
    ) {
      return imageError(`Vertex AI kota/limit hatası. Proje kotasını, bölgeyi ve faturalandırmayı kontrol et. Sağlayıcı mesajı: ${providerMessage}`, 429);
    }

    return imageError(`Vertex AI görsel modeli kullanılamadı. Sağlayıcı mesajı: ${providerMessage}`, 502);
  }

  if (message) {
    return imageError(message, 500);
  }

  return imageError("Görsel üretilemedi. Lütfen tekrar dene.", 500);
}

export async function POST(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return imageError("Görsel üretmek için giriş yapmalısın.", 401);
  }

  const usageAccess = await checkUsage(userId, "ai_images");
  if (!usageAccess.ok) return imageError(usageAccess.error, usageAccess.status);

  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return imageError("Medya depolama yapılandırılmadı.", 503);
  }

  const body = (await req.json()) as ImageStudioBody;
  const prompt = safeText(body.prompt);
  const style = safeText(body.style, 240);
  const ratioKey = body.ratio === "portrait" || body.ratio === "landscape" ? body.ratio : "square";
  const ratio = ratioSettings[ratioKey];

  if (!prompt) {
    return imageError("Görsel fikrini yazmalısın.", 400);
  }

  let mediaId = "";

  try {
    const enhancedPrompt = buildImagePrompt(prompt, style, ratioKey);
    const generatedImage = await generateVertexImage(enhancedPrompt);
    const filename = filenameFromPrompt(prompt, generatedImage.mimeType);
    const created = await createMedia(userId, {
      type: "image",
      name: filename,
      mimeType: generatedImage.mimeType,
      size: generatedImage.buffer.byteLength,
      width: ratio.width,
      height: ratio.height,
    });

    if (!created.ok) {
      return imageError("Görsel medya kaydı oluşturulamadı.", created.status);
    }

    mediaId = created.data.id;
    const storagePath = createUploadPath(userId, mediaId, filename);
    const uploaded = await supabase.storage.from(mediaBucketName).upload(storagePath, generatedImage.buffer, {
      contentType: generatedImage.mimeType,
      upsert: true,
    });

    if (uploaded.error) {
      await deleteMedia(userId, mediaId);
      return imageError("Görsel medya merkezine kaydedilemedi.", 503);
    }

    const stored = await updateMediaStorage(userId, mediaId, storagePath);

    if (!stored.ok) {
      await supabase.storage.from(mediaBucketName).remove([storagePath]);
      await deleteMedia(userId, mediaId);
      return imageError("Görsel medya merkezine bağlanamadı.", stored.status);
    }

    const signed = await createSignedMediaUrl(userId, storagePath);

    if (!signed.ok) {
      return imageError("Görsel önizleme bağlantısı oluşturulamadı.", signed.status);
    }

    const usage = await recordUsage(userId, "ai_images", `image:${mediaId}`);
    if (!usage.ok) {
      await supabase.storage.from(mediaBucketName).remove([storagePath]);
      await deleteMedia(userId, mediaId);
      return imageError(usage.error, usage.status);
    }

    return Response.json({
      data: {
        media: stored.data,
        signedUrl: signed.data.signedUrl,
        prompt: enhancedPrompt,
      },
    });
  } catch (error) {
    console.error("Vertex AI Error:", error);
    if (error instanceof Error && error.stack) {
      console.error("Vertex AI Error Stack:", error.stack);
    }
    if (mediaId) {
      await deleteMedia(userId, mediaId);
    }

    return publicImageError(error);
  }
}
