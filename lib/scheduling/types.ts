export type ScheduledPublishStatus = "scheduled" | "processing" | "published" | "failed" | "cancelled";

export type ScheduledPublish = {
  id: string;
  profileId: string | null;
  mediaAssetId: string;
  platforms: string[];
  title: string;
  caption: string;
  hashtags: string[];
  platformContent: Record<string, unknown>;
  scheduledAt: string;
  timezone: string;
  status: ScheduledPublishStatus;
  lastError: string | null;
  publishedAt: string | null;
  accountName: string | null;
  accountUsername: string | null;
  media: { name: string; type: "image" | "video" | "logo"; signedUrl: string | null } | null;
  createdAt: string;
  updatedAt: string;
};

export type ScheduledPublishInput = {
  profileId?: string | null;
  mediaAssetId: string;
  platforms: string[];
  title: string;
  caption: string;
  hashtags?: string[];
  platformContent?: Record<string, unknown>;
  scheduledAt: string;
  timezone: string;
};
