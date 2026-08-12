export type DraftPlatformContent = {
  text: string;
  hashtags: string[];
  visualPrompt: string;
  videoIdea: string;
};

export type PublishDraft = {
  id: string;
  profileId: string | null;
  sourceContentId: string | null;
  mediaAssetId: string | null;
  name: string;
  selectedPlatforms: string[];
  caption: string;
  hashtags: string[];
  platformContent: Record<string, DraftPlatformContent>;
  platformSettings: Record<string, unknown>;
  media: { name: string; type: "image" | "video" | "logo"; signedUrl: string | null } | null;
  createdAt: string;
  updatedAt: string;
};

export type SaveDraftInput = {
  id?: string;
  profileId?: string | null;
  sourceContentId?: string | null;
  mediaAssetId?: string | null;
  name: string;
  selectedPlatforms: string[];
  caption: string;
  hashtags: string[];
  platformContent: Record<string, DraftPlatformContent>;
  platformSettings?: Record<string, unknown>;
};
