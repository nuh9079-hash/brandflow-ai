import { createProvider } from "./base";

export const linkedinProvider = createProvider({
  platform: "linkedin",
  label: "LinkedIn",
  requiredEnv: ["LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET", "LINKEDIN_REDIRECT_URI"],
});
