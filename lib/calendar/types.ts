import type { MediaAsset } from "@/lib/media/types";

export type CalendarPlatform = "instagram" | "facebook" | "twitter" | "tiktok" | "linkedin";
export type CalendarStatus = "draft" | "scheduled" | "published" | "failed";

export type ScheduledPost = {
  id: string;
  clerkUserId: string;
  profileId?: string | null;
  mediaAssetId?: string | null;
  platform: CalendarPlatform;
  status: CalendarStatus;
  title: string;
  caption: string;
  scheduledAt?: string | null;
  timezone: string;
  autoPublish: boolean;
  attemptCount: number;
  lastAttemptAt?: string | null;
  nextAttemptAt?: string | null;
  failureReason?: string | null;
  publishedAt?: string | null;
  externalPostId?: string | null;
  createdAt: string;
  updatedAt: string;
  media?: MediaAsset | null;
};

export type ScheduledPostInput = {
  profileId?: string | null;
  mediaAssetId?: string | null;
  platform: CalendarPlatform;
  status: CalendarStatus;
  title: string;
  caption: string;
  scheduledAt?: string | null;
  timezone: string;
  autoPublish: boolean;
};

export type ScheduledPostUpdate = Partial<ScheduledPostInput>;

export type CalendarFilters = {
  from?: string;
  to?: string;
  platform?: CalendarPlatform | "all";
  status?: CalendarStatus | "all";
  limit?: number;
};

export type CalendarServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string };

export const calendarPlatforms: CalendarPlatform[] = ["instagram", "facebook", "twitter", "tiktok", "linkedin"];
export const calendarStatuses: CalendarStatus[] = ["draft", "scheduled", "published", "failed"];
export const automaticPublishPlatforms: CalendarPlatform[] = ["instagram", "facebook"];
