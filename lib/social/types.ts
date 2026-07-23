export type SocialPlatform = "instagram" | "tiktok" | "facebook" | "twitter" | "linkedin" | "youtube";

export type SocialProviderStatus = {
  platform: SocialPlatform;
  label: string;
  connected: boolean;
  configured: boolean;
  requiredEnv: string[];
  message: string;
};

export type SocialPublishPayload = {
  text: string;
  hashtags: string[];
  visualPrompt?: string;
  videoIdea?: string;
};

export type SocialProviderResult = {
  ok: boolean;
  message: string;
};

export interface SocialProvider {
  platform: SocialPlatform;
  label: string;
  connect: () => Promise<SocialProviderResult>;
  disconnect: () => Promise<SocialProviderResult>;
  publish: (payload: SocialPublishPayload) => Promise<SocialProviderResult>;
  getStatus: () => Promise<SocialProviderStatus>;
}
