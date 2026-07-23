import { createProvider } from "./base";

export const twitterProvider = createProvider({
  platform: "twitter",
  label: "X",
  requiredEnv: ["TWITTER_CLIENT_ID", "TWITTER_CLIENT_SECRET", "TWITTER_REDIRECT_URI"],
});
