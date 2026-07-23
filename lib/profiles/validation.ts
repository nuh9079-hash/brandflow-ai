import {
  createEmptyProfileInput,
  defaultProfilePlatforms,
  type ProfileInput,
  type ProfilePlatform,
  type ProfileType,
  type UserProfile,
} from "@/lib/profiles/types";

const validProfileTypes = new Set<ProfileType>(["business", "personal", "creator"]);
const validPlatforms = new Set<ProfilePlatform>(defaultProfilePlatforms);
const maxTextLength = 500;
const maxNameLength = 90;

function stringValue(value: unknown, maxLength = maxTextLength) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function boolValue(value: unknown) {
  return value === true;
}

function arrayValue(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => stringValue(entry, 80))
      .filter(Boolean)
      .slice(0, 24);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .slice(0, 24);
  }

  return [];
}

function platformArray(value: unknown, fallback: ProfilePlatform[]) {
  const values = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
  const platforms = values.filter((entry): entry is ProfilePlatform => typeof entry === "string" && validPlatforms.has(entry as ProfilePlatform));
  return platforms.length > 0 ? Array.from(new Set(platforms)) : fallback;
}

export function sanitizeProfileInput(value: unknown): ProfileInput {
  const raw = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const profileType = validProfileTypes.has(raw.profile_type as ProfileType)
    ? (raw.profile_type as ProfileType)
    : "business";
  const defaults = createEmptyProfileInput(profileType);

  return {
    profile_name: stringValue(raw.profile_name, maxNameLength) || defaults.profile_name,
    profile_type: profileType,
    is_default: boolValue(raw.is_default),
    business_name: stringValue(raw.business_name),
    product_or_service: stringValue(raw.product_or_service),
    description: stringValue(raw.description, 1200),
    brand_tone: stringValue(raw.brand_tone, 80) || defaults.brand_tone,
    target_audience: stringValue(raw.target_audience),
    price_range: stringValue(raw.price_range),
    campaign_info: stringValue(raw.campaign_info),
    competitor: stringValue(raw.competitor),
    website: stringValue(raw.website),
    brand_colors: stringValue(raw.brand_colors),
    default_platforms: platformArray(raw.default_platforms, defaults.default_platforms),
    language: stringValue(raw.language, 40) || defaults.language,
    content_goal: stringValue(raw.content_goal),
    display_name: stringValue(raw.display_name),
    photo_style: stringValue(raw.photo_style),
    personal_mood: stringValue(raw.personal_mood, 80),
    content_style: stringValue(raw.content_style, 80) || defaults.content_style,
    interests: arrayValue(raw.interests),
    humor_level: stringValue(raw.humor_level, 80) || defaults.humor_level,
    personal_platforms: platformArray(raw.personal_platforms, defaults.personal_platforms),
    personal_language: stringValue(raw.personal_language, 40) || defaults.personal_language,
    personal_notes: stringValue(raw.personal_notes, 800),
    creator_name: stringValue(raw.creator_name),
    main_topic: stringValue(raw.main_topic),
    sub_topics: arrayValue(raw.sub_topics),
    creator_audience: stringValue(raw.creator_audience),
    video_duration: stringValue(raw.video_duration, 80) || defaults.video_duration,
    creator_tone: stringValue(raw.creator_tone, 80) || defaults.creator_tone,
    hook_style: stringValue(raw.hook_style),
    cta_style: stringValue(raw.cta_style),
    thumbnail_style: stringValue(raw.thumbnail_style),
    creator_platforms: platformArray(raw.creator_platforms, defaults.creator_platforms),
    creator_language: stringValue(raw.creator_language, 40) || defaults.creator_language,
    required_words: arrayValue(raw.required_words),
    blocked_words: arrayValue(raw.blocked_words),
    blocked_topics: arrayValue(raw.blocked_topics),
  };
}

export function profileInputError(input: ProfileInput) {
  if (!input.profile_name.trim()) return "Profil adı zorunludur.";
  if (!validProfileTypes.has(input.profile_type)) return "Profil tipi geçersiz.";

  if (input.profile_type === "business" && !input.product_or_service?.trim() && !input.business_name?.trim()) {
    return "İşletme profili için marka veya ürün bilgisini yaz.";
  }

  if (input.profile_type === "personal" && !input.content_style?.trim()) {
    return "Kişisel profil için içerik tarzı seç.";
  }

  if (input.profile_type === "creator" && !input.main_topic?.trim()) {
    return "İçerik üretici profili için ana konuyu yaz.";
  }

  return "";
}

export function normalizeProfile(row: Record<string, unknown>): UserProfile {
  const input = sanitizeProfileInput(row);
  const now = new Date().toISOString();

  return {
    id: stringValue(row.id, 80),
    clerk_user_id: stringValue(row.clerk_user_id, 140),
    ...input,
    created_at: stringValue(row.created_at, 80) || now,
    updated_at: stringValue(row.updated_at, 80) || now,
    last_used_at: stringValue(row.last_used_at, 80) || null,
  };
}

export function profileToPromptLines(profile: UserProfile | ProfileInput | null) {
  if (!profile) return "";

  const shared = [
    `Aktif profil: ${profile.profile_name}`,
    `Profil tipi: ${profile.profile_type}`,
    `Varsayılan dil: ${profile.language || profile.personal_language || profile.creator_language || "Türkçe"}`,
  ];

  if (profile.profile_type === "personal") {
    return [
      ...shared,
      `Kişisel tarz: ${profile.content_style || "Doğal"}`,
      `Ruh hali: ${profile.personal_mood || "Belirtilmedi"}`,
      `İlgi alanları: ${profile.interests.join(", ") || "Belirtilmedi"}`,
      `Notlar: ${profile.personal_notes || "Yok"}`,
    ].join("\n");
  }

  if (profile.profile_type === "creator") {
    return [
      ...shared,
      `Ana konu: ${profile.main_topic || "Belirtilmedi"}`,
      `Alt konular: ${profile.sub_topics.join(", ") || "Belirtilmedi"}`,
      `Hedef kitle: ${profile.creator_audience || "Belirtilmedi"}`,
      `Hook tarzı: ${profile.hook_style || "Belirtilmedi"}`,
      `CTA tarzı: ${profile.cta_style || "Belirtilmedi"}`,
      `Thumbnail tarzı: ${profile.thumbnail_style || "Belirtilmedi"}`,
    ].join("\n");
  }

  return [
    ...shared,
    `Marka adı: ${profile.business_name || "Belirtilmedi"}`,
    `Ürün / hizmet: ${profile.product_or_service || "Belirtilmedi"}`,
    `Marka tonu: ${profile.brand_tone || "Samimi"}`,
    `Hedef kitle: ${profile.target_audience || "Belirtilmedi"}`,
    `Marka renkleri: ${profile.brand_colors || "Belirtilmedi"}`,
    `İçerik hedefi: ${profile.content_goal || "Belirtilmedi"}`,
  ].join("\n");
}
