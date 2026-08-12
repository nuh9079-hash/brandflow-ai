export type PublishAttemptStatus = "pending" | "published" | "failed";

export type PublishAttempt = {
  id: string;
  retryOfId: string | null;
  platform: "instagram";
  accountName: string | null;
  accountUsername: string | null;
  mediaAssetId: string;
  caption: string;
  status: PublishAttemptStatus;
  providerMediaId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  media: { name: string; type: "image" | "video" | "logo"; signedUrl: string | null } | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};
