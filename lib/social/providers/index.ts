import { facebookProvider } from "./facebook";
import { instagramProvider } from "./instagram";
import { linkedinProvider } from "./linkedin";
import { tiktokProvider } from "./tiktok";
import { twitterProvider } from "./twitter";
import { youtubeProvider } from "./youtube";

export const socialProviders = [
  instagramProvider,
  tiktokProvider,
  facebookProvider,
  twitterProvider,
  linkedinProvider,
  youtubeProvider,
];

export async function getSocialProviderStatuses() {
  return Promise.all(socialProviders.map((provider) => provider.getStatus()));
}
