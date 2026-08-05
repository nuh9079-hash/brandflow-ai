import type { MediaAsset } from "@/lib/media/types";

export type VideoStatus = "preparing" | "queued" | "processing" | "completed" | "failed";
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

export class RunwayProviderError extends Error {
  constructor(
    message: string,
    public readonly details: {
      httpStatus: number;
      responseBody: string;
      code: string | null;
      endpoint: string;
      model: string | null;
      duration: number | null;
      ratio: string | null;
    },
  ) {
    super(message);
    this.name = "RunwayProviderError";
  }
}

function sanitizeProviderText(value: string) {
  return value
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [REDACTED]")
    .replace(/("?(?:api[_-]?key|authorization|token|secret)"?\s*[:=]\s*")([^"]+)(")/gi, "$1[REDACTED]$3")
    .replace(/(https?:\/\/[^\s"'?]+)\?[^\s"']+/gi, "$1?[REDACTED]")
    .slice(0, 4000);
}

async function providerFailure(response: Response, context: {
  endpoint: string;
  model?: string;
  duration?: number;
  ratio?: string;
}) {
  const responseBody = sanitizeProviderText(await response.text());
  let code: string | null = null;
  let message = responseBody || `Runway isteği HTTP ${response.status} ile başarısız oldu.`;

  try {
    const parsed = JSON.parse(responseBody) as { code?: unknown; error?: unknown; message?: unknown };
    code = typeof parsed.code === "string" ? parsed.code : null;
    if (typeof parsed.message === "string") message = parsed.message;
    else if (typeof parsed.error === "string") message = parsed.error;
    else if (parsed.error && typeof parsed.error === "object" && "message" in parsed.error) {
      const nestedError = parsed.error as { message?: unknown; code?: unknown };
      const nestedMessage = nestedError.message;
      if (!code && typeof nestedError.code === "string") code = nestedError.code;
      if (typeof nestedMessage === "string") message = nestedMessage;
    }
  } catch {
    // Non-JSON provider responses are returned as sanitized text.
  }

  return new RunwayProviderError(sanitizeProviderText(message), {
    httpStatus: response.status,
    responseBody,
    code,
    endpoint: context.endpoint,
    model: context.model || null,
    duration: context.duration ?? null,
    ratio: context.ratio || null,
  });
}

export const videoStyles = new Set<VideoStyle>(["Cinematic", "Funny", "Product Promotion", "Social Media", "Realistic"]);

export const aspectRatios: Record<VideoAspectRatio, { providerRatio: string; width: number; height: number }> = {
  "9:16": { providerRatio: "720:1280", width: 720, height: 1280 },
  "1:1": { providerRatio: "960:960", width: 960, height: 960 },
  "16:9": { providerRatio: "1280:720", width: 1280, height: 720 },
};

const defaultRunwayDurations = [5, 10, 15] as const;
export const missingRunwayKeyMessage = "RUNWAY API anahtarı bulunamadı.";
const runwayApiKey = process.env.RUNWAY_API_KEY?.trim() || "";

export function validateRunwayConfig() {
  return runwayApiKey
    ? { ok: true as const, apiKey: runwayApiKey }
    : { ok: false as const, error: missingRunwayKeyMessage };
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

export function getVideoProvider() {
  const validation = validateRunwayConfig();
  const apiKey = validation.ok ? validation.apiKey : undefined;
  const supportedDurations = getRunwayDurations();

  return {
    id: "runway",
    name: "Runway",
    configured: Boolean(apiKey && apiKey.length > 0),
    apiKey,
    baseUrl: process.env.RUNWAY_API_BASE_URL || "https://api.dev.runwayml.com/v1",
    apiVersion: process.env.RUNWAY_API_VERSION || "2024-11-06",
    textModel: process.env.RUNWAY_TEXT_VIDEO_MODEL || "seedance2_mini",
    imageModel: process.env.RUNWAY_IMAGE_VIDEO_MODEL || "seedance2_mini",
    videoModel: process.env.RUNWAY_VIDEO_TO_VIDEO_MODEL || "seedance2_mini",
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
  if (["pending", "queued", "submitted", "starting"].includes(value)) return "queued";
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
    throw new Error(missingRunwayKeyMessage);
  }

  const ratio = aspectRatios[input.aspectRatio];
  const endpoint = input.source ? (input.source.media.type === "video" ? "video_to_video" : "image_to_video") : "text_to_video";
  const model = input.source?.media.type === "video"
    ? provider.videoModel
    : input.source?.media.type === "image"
      ? provider.imageModel
      : provider.textModel;
  const sourcePayload =
    input.source?.media.type === "video"
      ? { videoUri: input.source.signedUrl }
      : input.source?.media.type === "image"
        ? { promptImage: [{ uri: input.source.signedUrl, position: "first" }] }
        : {};

  const requestEndpoint = `${provider.baseUrl}/${endpoint}`;
  const response = await fetch(requestEndpoint, {
    method: "POST",
    headers: providerHeaders(provider),
    body: JSON.stringify({
      model,
      promptText: input.prompt,
      ratio: ratio.providerRatio,
      duration: input.duration,
      ...sourcePayload,
    }),
  });

  if (!response.ok) {
    throw await providerFailure(response, {
      endpoint: requestEndpoint,
      model,
      duration: input.duration,
      ratio: ratio.providerRatio,
    });
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
    throw new Error(missingRunwayKeyMessage);
  }

  const requestEndpoint = `${provider.baseUrl}/tasks/${encodeURIComponent(jobId)}`;
  const response = await fetch(requestEndpoint, {
    method: "GET",
    headers: providerHeaders(provider),
  });

  if (!response.ok) {
    throw await providerFailure(response, { endpoint: requestEndpoint });
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
