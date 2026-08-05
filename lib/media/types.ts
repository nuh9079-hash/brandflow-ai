export type MediaAssetType = "image" | "video" | "logo";

export type MediaAsset = {
  id: string;
  clerkUserId: string;
  profileId?: string | null;
  type: MediaAssetType;
  name: string;
  mimeType: string;
  size: number;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
  storagePath?: string | null;
  storageUrl?: string | null;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateMediaInput = {
  type: MediaAssetType;
  name: string;
  mimeType: string;
  size: number;
  profileId?: string | null;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
  storagePath?: string | null;
  storageUrl?: string | null;
};

export type UpdateMediaInput = {
  name?: string;
  type?: MediaAssetType;
  profileId?: string | null;
  isFavorite?: boolean;
};

export type MediaFilters = {
  type?: MediaAssetType;
  profileId?: string;
  search?: string;
  sort?: "newest" | "oldest" | "largest" | "smallest";
};

export type MediaServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string };

export const mediaBucketName = "brandflow-media";
