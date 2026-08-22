import { getSocialConnection } from "@/lib/social/connections";
import { facebookProvider } from "./facebook";
import { instagramProvider } from "./instagram";
import { linkedinProvider } from "./linkedin";
import { tiktokProvider } from "./tiktok";
import { twitterProvider } from "./twitter";
import { youtubeProvider } from "./youtube";

export const socialProviders = [instagramProvider,tiktokProvider,facebookProvider,twitterProvider,linkedinProvider,youtubeProvider];

export async function getSocialProviderStatuses(userId?: string) {
  const statuses = await Promise.all(socialProviders.map((provider) => provider.getStatus()));
  if (!userId) return statuses;
  const instagram = await getSocialConnection(userId, "instagram");
  return statuses.map((status) => status.platform === "instagram" && instagram ? { ...status, connected: true, configured: true, message: `${instagram.accountName || "Instagram"} bağlı ve otomatik yayın için hazır.` } : status);
}
