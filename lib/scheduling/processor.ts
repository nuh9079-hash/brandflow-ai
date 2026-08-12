import { publishInstagramImage } from "@/lib/social/instagram-publishing";
import { createPublishAttempt, finishPublishAttempt } from "@/lib/publishing/server";
import { createNotification } from "@/lib/notifications/server";
import { claimScheduledPublish, finishScheduledPublish } from "@/lib/scheduling/server";

export async function processScheduledPublish(id: string, options?: { retry?: boolean; expectedUserId?: string }) {
  const claim = await claimScheduledPublish(id, options?.retry ? ["failed"] : ["scheduled"], options?.expectedUserId);
  if (!claim) return { ok: false as const, status: 409, error: "Plan işleniyor, tamamlanmış veya artık uygun değil." };
  const { userId, item } = claim;

  const attempt = await createPublishAttempt(userId, {
    accountName: item.accountName,
    accountUsername: item.accountUsername,
    mediaAssetId: item.mediaAssetId,
    caption: item.caption,
  });
  if (!attempt.ok) {
    await finishScheduledPublish(userId, id, { status: "failed", error: attempt.error });
    return attempt;
  }

  const result = await publishInstagramImage(userId, item.mediaAssetId, item.caption);
  if (result.ok) {
    await finishPublishAttempt(userId, attempt.data.id, { status: "published", providerMediaId: result.data.mediaId });
    await finishScheduledPublish(userId, id, { status: "published" });
    await createNotification(userId, {
      type: "schedule_completed",
      title: "Planlı paylaşım yayınlandı",
      description: "Instagram paylaşımın planlanan zamanda başarıyla yayınlandı.",
      href: "/history",
      metadata: { scheduledPublishId: id, attemptId: attempt.data.id, platform: "instagram" },
    });
    return { ok: true as const, data: { scheduledPublishId: id, attemptId: attempt.data.id, providerMediaId: result.data.mediaId } };
  }

  await finishPublishAttempt(userId, attempt.data.id, { status: "failed", errorCode: result.code, errorMessage: result.error });
  await finishScheduledPublish(userId, id, { status: "failed", error: result.error });
  await createNotification(userId, {
    type: result.code === "connection_expired" ? "connection_expired" : "publish_failed",
    title: result.code === "connection_expired" ? "Instagram bağlantısını yenile" : "Planlı paylaşım başarısız",
    description: result.error,
    href: result.code === "connection_expired" ? "/connections" : "/queue",
    metadata: { scheduledPublishId: id, attemptId: attempt.data.id, platform: "instagram", errorCode: result.code },
  });
  return { ok: false as const, status: result.status, error: result.error, code: result.code };
}
