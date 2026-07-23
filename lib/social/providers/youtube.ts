import { createProvider } from "./base";

export const youtubeProvider = createProvider({
  platform: "youtube",
  label: "YouTube",
  requiredEnv: ["YOUTUBE_CLIENT_ID", "YOUTUBE_CLIENT_SECRET", "YOUTUBE_REDIRECT_URI"],
});
