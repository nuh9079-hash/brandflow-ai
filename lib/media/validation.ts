import type { CreateMediaInput, MediaAssetType, MediaFilters, UpdateMediaInput } from "@/lib/media/types";

const supportedImageMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const supportedVideoMimeTypes = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const supportedTypes = new Set<MediaAssetType>(["image", "video", "logo"]);
const imageLimit = 8 * 1024 * 1024;
const videoLimit = 100 * 1024 * 1024;
const maxNameLength = 180;

function stringValue(value: unknown, maxLength = maxNameLength) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function nullableString(value: unknown, maxLength = maxNameLength) {
  const text = stringValue(value, maxLength);
  return text || null;
}

function positiveNumber(value: unknown) {
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : 0;
}

function optionalNumber(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue) && numberValue >= 0 ? numberValue : null;
}

function mediaType(value: unknown) {
  return typeof value === "string" && supportedTypes.has(value as MediaAssetType)
    ? (value as MediaAssetType)
    : null;
}

export function mediaLimitForType(type: MediaAssetType) {
  return type === "video" ? videoLimit : imageLimit;
}

export function isMimeAllowed(type: MediaAssetType, mimeType: string) {
  return type === "video" ? supportedVideoMimeTypes.has(mimeType) : supportedImageMimeTypes.has(mimeType);
}

export function validateCreateMediaInput(value: unknown) {
  const raw = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const type = mediaType(raw.type);
  const name = stringValue(raw.name);
  const mimeType = stringValue(raw.mimeType, 120);
  const size = positiveNumber(raw.size);

  if (!type) return { ok: false as const, error: "Geçerli medya tipi zorunludur." };
  if (!name) return { ok: false as const, error: "Medya adı zorunludur." };
  if (!mimeType) return { ok: false as const, error: "MIME tipi zorunludur." };
  if (!size) return { ok: false as const, error: "Dosya boyutu pozitif sayı olmalıdır." };
  if (!isMimeAllowed(type, mimeType)) return { ok: false as const, error: "Bu dosya türü desteklenmiyor." };
  if (size > mediaLimitForType(type)) return { ok: false as const, error: "Dosya boyutu izin verilen sınırı aşıyor." };

  return {
    ok: true as const,
    data: {
      type,
      name,
      mimeType,
      size,
      profileId: nullableString(raw.profileId, 80),
      width: optionalNumber(raw.width),
      height: optionalNumber(raw.height),
      duration: optionalNumber(raw.duration),
      storagePath: nullableString(raw.storagePath, 600),
      storageUrl: nullableString(raw.storageUrl, 1200),
    } satisfies CreateMediaInput,
  };
}

export function validateUpdateMediaInput(value: unknown) {
  const raw = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const input: UpdateMediaInput = {};

  if ("name" in raw) {
    const name = stringValue(raw.name);
    if (!name) return { ok: false as const, error: "Medya adı boş olamaz." };
    input.name = name;
  }

  if ("type" in raw) {
    const type = mediaType(raw.type);
    if (!type) return { ok: false as const, error: "Geçerli medya tipi zorunludur." };
    input.type = type;
  }

  if ("profileId" in raw) {
    input.profileId = nullableString(raw.profileId, 80);
  }

  if ("isFavorite" in raw) {
    if (typeof raw.isFavorite !== "boolean") return { ok: false as const, error: "Favori değeri geçersiz." };
    input.isFavorite = raw.isFavorite;
  }

  if ("viewedAt" in raw) {
    const viewedAt = stringValue(raw.viewedAt);
    if (!viewedAt || Number.isNaN(Date.parse(viewedAt))) {
      return { ok: false as const, error: "Görüntülenme zamanı geçersiz." };
    }
    input.viewedAt = new Date(viewedAt).toISOString();
  }

  if (!("name" in input) && !("type" in input) && !("profileId" in input) && !("isFavorite" in input) && !("viewedAt" in input)) {
    return { ok: false as const, error: "Güncellenecek alan bulunamadı." };
  }

  return { ok: true as const, data: input };
}

export function validateUploadRequest(value: unknown) {
  const raw = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const filename = stringValue(raw.filename, 240);
  const createValidation = validateCreateMediaInput({
    type: raw.type,
    name: filename,
    mimeType: raw.mimeType,
    size: raw.size,
    profileId: raw.profileId,
  });

  if (!filename) return { ok: false as const, error: "Dosya adı zorunludur." };
  if (!createValidation.ok) return createValidation;

  return {
    ok: true as const,
    data: {
      filename,
      media: createValidation.data,
    },
  };
}

export function validateMediaFilters(searchParams: URLSearchParams) {
  const type = mediaType(searchParams.get("type"));
  const sortValue = searchParams.get("sort");
  const sort =
    sortValue === "oldest" || sortValue === "largest" || sortValue === "smallest" || sortValue === "newest"
      ? sortValue
      : "newest";

  return {
    type: type ?? undefined,
    profileId: stringValue(searchParams.get("profileId"), 80) || undefined,
    search: stringValue(searchParams.get("search"), 120) || undefined,
    sort,
  } satisfies MediaFilters;
}
