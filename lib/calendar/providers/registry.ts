import type { CalendarPlatform } from "@/lib/calendar/types";
import type { SocialPublisher } from "./types";

function unavailableProvider(id: CalendarPlatform, envName: string): SocialPublisher {
  return {
    id,
    configured: false,
    async publish() {
      return {
        ok: false,
        status: 503,
        error: `${envName} yapılandırılmadığı için gerçek paylaşım yapılamaz.`,
      };
    },
  };
}

export function getPublisher(platform: CalendarPlatform): SocialPublisher {
  const providers: Record<CalendarPlatform, SocialPublisher> = {
    instagram: unavailableProvider("instagram", "INSTAGRAM_PUBLISH_ACCESS_TOKEN"),
    facebook: unavailableProvider("facebook", "FACEBOOK_PUBLISH_ACCESS_TOKEN"),
    twitter: unavailableProvider("twitter", "TWITTER_PUBLISH_ACCESS_TOKEN"),
    tiktok: unavailableProvider("tiktok", "TIKTOK_PUBLISH_ACCESS_TOKEN"),
    linkedin: unavailableProvider("linkedin", "LINKEDIN_PUBLISH_ACCESS_TOKEN"),
  };

  return providers[platform];
}
