import { facebookProvider } from "./facebook";
import { instagramProvider } from "./instagram";
import { linkedinProvider } from "./linkedin";
import { tiktokProvider } from "./tiktok";
import { twitterProvider } from "./twitter";
import { youtubeProvider } from "./youtube";
import { listSocialConnections, type SocialPlatform as ConnectionPlatform } from "@/lib/social/connections";
import type { SocialPlatform } from "@/lib/social/types";

export const socialProviders = [
  instagramProvider,
  tiktokProvider,
  facebookProvider,
  twitterProvider,
  linkedinProvider,
  youtubeProvider,
];

function connectionPlatform(platform: SocialPlatform): ConnectionPlatform {
  return platform === "twitter" ? "x" : platform;
}

export async function getSocialProviderStatuses(userId?: string) {
  const configuredStatuses = await Promise.all(socialProviders.map((provider) => provider.getStatus()));
  if (!userId) return configuredStatuses;

  const connections = await listSocialConnections(userId);
  if (!connections.ok) return configuredStatuses;

  return configuredStatuses.map((provider) => {
    const priority = { connected: 5, expired: 4, connecting: 3, error: 2, disconnected: 1 } as const;
    const connection = connections.data
      .filter((item) => item.platform === connectionPlatform(provider.platform))
      .sort((left, right) => priority[right.status] - priority[left.status])[0];
    if (!connection) return provider;
    const connected = connection.status === "connected" && connection.hasAccessToken;
    const account = connection.accountUsername || connection.accountName;
    return {
      ...provider,
      connected,
      connectionId: connection.id,
      accountName: connection.accountName,
      accountUsername: connection.accountUsername,
      connectionStatus: connected ? "connected" as const : connection.status,
      message: connected
        ? `${account ? `@${account.replace(/^@/, "")}` : provider.label} hesabı bağlı ve paylaşım için hazır.`
        : connection.status === "expired" || !connection.hasAccessToken
          ? "Bağlantı anahtarı eksik veya süresi dolmuş. Hesabı yeniden bağla."
          : provider.message,
    };
  });
}
