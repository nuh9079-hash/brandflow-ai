import type { MediaAsset } from "@/lib/media/types";

export type VideoStatus = "preparing" | "submitting" | "processing" | "completed" | "failed";
export type VideoStyle = "Cinematic" | "Funny" | "Product Promotion" | "Social Media" | "Realistic";
export type VideoAspectRatio = "9:16" | "1:1" | "16:9";

export type VideoSource = {
  media: MediaAsset;
  signedUrl: string;
};

export type SubmittedVideoJob = {
  jobId: string;
  status: VideoStatus;
};

export type PolledVideoJob = {
  jobId: string;
  status: VideoStatus;
  outputUrl?: string;
  error?: string;
};

export const videoStyles = new Set<VideoStyle>(["Cinematic", "Funny", "Product Promotion", "Social Media", "Realistic"]);

export const aspectRatios: Record<VideoAspectRatio, { providerRatio: string; width: number; height: number }> = {
  "9:16": { providerRatio: "720:1280", width: 720, height: 1280 },
  "1:1": { providerRatio: "960:960", width: 960, height: 960 },
  "16:9": { providerRatio: "1280:720", width: 1280, height: 720 },
};

const defaultRunwayDurations = [5, 10] as const;

function getRunwayDurations() {
  const configured = process.env.RUNWAY_VIDEO_DURATIONS;
  if (!configured) return [...defaultRunwayDurations];

  const durations = configured
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => value === 5 || value === 10 || value === 15);

  return Array.from(new Set(durations)).sort((first, second) => first - second);
}

export function getVideoProvider() {
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

export function normalizeProviderStatus(status: unknown): VideoStatus {
  const value = typeof status === "string" ? status.toLowerCase() : "";

  if (["succeeded", "success", "completed", "complete"].includes(value)) return "completed";
  if (["failed", "failure", "cancelled", "canceled"].includes(value)) return "failed";
  if (["pending", "queued", "submitted", "starting"].includes(value)) return "submitting";
  return "processing";
}

export async function submitVideoJob(input: {
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
  const endpoint = input.source ? (input.source.media.type === "video" ? "video_to_video" : "image_to_video") : "text_to_video";
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

export async function pollVideoJob(jobId: string): Promise<PolledVideoJob> {
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
