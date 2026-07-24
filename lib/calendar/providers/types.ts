import type { ScheduledPost } from "@/lib/calendar/types";

export type PublishResult =
  | { ok: true; externalId?: string; publishedAt: string }
  | { ok: false; status: number; error: string };

export type SocialPublisher = {
  id: string;
  configured: boolean;
  publish: (post: ScheduledPost) => Promise<PublishResult>;
};
