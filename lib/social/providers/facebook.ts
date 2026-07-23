import { createProvider } from "./base";

export const facebookProvider = createProvider({
  platform: "facebook",
  label: "Facebook",
  requiredEnv: ["FACEBOOK_APP_ID", "FACEBOOK_APP_SECRET", "FACEBOOK_REDIRECT_URI"],
});
