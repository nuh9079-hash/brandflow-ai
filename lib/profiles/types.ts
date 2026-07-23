export type ProfileType = "business" | "personal" | "creator";

export type ProfilePlatform =
  | "instagram"
  | "tiktok"
  | "reels"
  | "youtubeShorts"
  | "facebook"
  | "twitter"
  | "linkedIn"
  | "adCopies"
  | "story"
  | "hashtags"
  | "imagePrompts"
  | "contentPlan";

export type UserProfile = {
  id: string;
  clerk_user_id: string;
  profile_name: string;
  profile_type: ProfileType;
  is_default: boolean;
  business_name: string | null;
  product_or_service: string | null;
  description: string | null;
  brand_tone: string | null;
  target_audience: string | null;
  price_range: string | null;
  campaign_info: string | null;
  competitor: string | null;
  website: string | null;
  brand_colors: string | null;
  default_platforms: ProfilePlatform[];
  language: string | null;
  content_goal: string | null;
  display_name: string | null;
  photo_style: string | null;
  personal_mood: string | null;
  content_style: string | null;
  interests: string[];
  humor_level: string | null;
  personal_platforms: ProfilePlatform[];
  personal_language: string | null;
  personal_notes: string | null;
  creator_name: string | null;
  main_topic: string | null;
  sub_topics: string[];
  creator_audience: string | null;
  video_duration: string | null;
  creator_tone: string | null;
  hook_style: string | null;
  cta_style: string | null;
  thumbnail_style: string | null;
  creator_platforms: ProfilePlatform[];
  creator_language: string | null;
  required_words: string[];
  blocked_words: string[];
  blocked_topics: string[];
  created_at: string;
  updated_at: string;
  last_used_at: string | null;
};

export type ProfileInput = Omit<UserProfile, "id" | "clerk_user_id" | "created_at" | "updated_at" | "last_used_at">;

export type ProfileListResponse = {
  profiles: UserProfile[];
  storage: "supabase" | "local";
};

export const profileTypeLabels: Record<ProfileType, string> = {
  business: "İşletme",
  personal: "Kişisel",
  creator: "İçerik Üretici",
};

export const profileTypeDescriptions: Record<ProfileType, string> = {
  business: "Ürün, marka, kampanya ve satış içerikleri",
  personal: "Günlük paylaşım, fotoğraf, Story ve eğlenceli caption",
  creator: "Hook, senaryo, CTA, thumbnail ve düzenli içerik üretimi",
};

export const defaultProfilePlatforms: ProfilePlatform[] = [
  "instagram",
  "tiktok",
  "reels",
  "youtubeShorts",
  "facebook",
  "twitter",
  "linkedIn",
  "adCopies",
  "story",
  "hashtags",
  "imagePrompts",
  "contentPlan",
];

export const socialProfilePlatforms: ProfilePlatform[] = [
  "instagram",
  "tiktok",
  "reels",
  "youtubeShorts",
  "facebook",
  "twitter",
  "linkedIn",
  "story",
  "hashtags",
];

export const profilePlatformLabels: Record<ProfilePlatform, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  reels: "Reels",
  youtubeShorts: "YouTube Shorts",
  facebook: "Facebook",
  twitter: "X / Twitter",
  linkedIn: "LinkedIn",
  adCopies: "Reklam Metinleri",
  story: "Story",
  hashtags: "Hashtagler",
  imagePrompts: "Görsel Promptları",
  contentPlan: "7 Günlük İçerik Planı",
};

export function createEmptyProfileInput(type: ProfileType = "business"): ProfileInput {
  return {
    profile_name:
      type === "business"
        ? "Yeni işletme profili"
        : type === "personal"
          ? "Yeni kişisel profil"
          : "Yeni içerik üretici profili",
    profile_type: type,
    is_default: false,
    business_name: "",
    product_or_service: "",
    description: "",
    brand_tone: "Samimi",
    target_audience: "",
    price_range: "",
    campaign_info: "",
    competitor: "",
    website: "",
    brand_colors: "",
    default_platforms: type === "business" ? [...defaultProfilePlatforms] : [...socialProfilePlatforms],
    language: "Türkçe",
    content_goal: "",
    display_name: "",
    photo_style: "",
    personal_mood: "",
    content_style: "Doğal",
    interests: [],
    humor_level: "Orta",
    personal_platforms: [...socialProfilePlatforms],
    personal_language: "Türkçe",
    personal_notes: "",
    creator_name: "",
    main_topic: "",
    sub_topics: [],
    creator_audience: "",
    video_duration: "30 saniye",
    creator_tone: "Enerjik",
    hook_style: "",
    cta_style: "",
    thumbnail_style: "",
    creator_platforms: [...socialProfilePlatforms],
    creator_language: "Türkçe",
    required_words: [],
    blocked_words: [],
    blocked_topics: [],
  };
}
