import type { MediaAsset } from "@/lib/media/types";
import type { SocialPlatform } from "@/lib/social/connections";

export type ContentCalendarStatus = "draft" | "scheduled" | "publishing" | "published" | "failed";

export type ContentCalendarItem = {
  id: string;
  profileId: string | null;
  mediaAssetId: string | null;
  title: string;
  caption: string;
  scheduledAt: string;
  timezone: string;
  platforms: SocialPlatform[];
  status: ContentCalendarStatus;
  createdAt: string;
  updatedAt: string;
  media: MediaAsset | null;
};

export type ContentCalendarInput = {
  profileId?: string | null;
  mediaAssetId?: string | null;
  title: string;
  caption: string;
  scheduledAt: string;
  timezone: string;
  platforms: SocialPlatform[];
  status: ContentCalendarStatus;
};

export type ContentCalendarUpdate = Partial<ContentCalendarInput>;
export type ContentCalendarResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };
