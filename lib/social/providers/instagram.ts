import { createProvider } from "./base";

export const instagramProvider = createProvider({
  platform: "instagram",
  label: "Instagram",
  requiredEnv: ["INSTAGRAM_CLIENT_ID", "INSTAGRAM_CLIENT_SECRET", "INSTAGRAM_REDIRECT_URI"],
});
