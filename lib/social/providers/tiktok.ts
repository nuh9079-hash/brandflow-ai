import { createProvider } from "./base";

export const tiktokProvider = createProvider({
  platform: "tiktok",
  label: "TikTok",
  requiredEnv: ["TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET", "TIKTOK_REDIRECT_URI"],
});
