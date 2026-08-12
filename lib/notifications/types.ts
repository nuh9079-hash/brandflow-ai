export const notificationTypes = [
  "publish_succeeded", "publish_failed", "connection_connected", "connection_disconnected",
  "connection_expired", "image_completed", "video_completed", "media_failed",
  "schedule_due", "schedule_completed",
] as const;

export type NotificationType = (typeof notificationTypes)[number];

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  href: string;
  readAt: string | null;
  createdAt: string;
};
