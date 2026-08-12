import { auth } from "@clerk/nextjs/server";
import { publishInstagramImage } from "@/lib/social/instagram-publishing";
import { createNotification } from "@/lib/notifications/server";
import { createPublishAttempt, finishPublishAttempt, getRetryAttempt } from "@/lib/publishing/server";
import { listSocialConnections } from "@/lib/social/connections";

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Instagram paylaşımı için giriş yapmalısın." }, { status: 401 });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const retryAttemptId = text(body.retryAttemptId, 120);
  let mediaAssetId = text(body.mediaAssetId, 120);
  let caption = text(body.caption, 2400);
  if (retryAttemptId) {
    const previous = await getRetryAttempt(userId, retryAttemptId);
    if (!previous.ok) return Response.json({ error: previous.error }, { status: previous.status });
    if (previous.data.status !== "failed") return Response.json({ error: "Yalnızca başarısız paylaşımlar tekrar denenebilir." }, { status: 400 });
    mediaAssetId = previous.data.mediaAssetId;
    caption = previous.data.caption;
  }
  if (!mediaAssetId || !caption) return Response.json({ error: "Görsel ve açıklama seçmelisin." }, { status: 400 });

  const connections = await listSocialConnections(userId);
  const instagram = connections.ok ? connections.data.find((connection) => connection.platform === "instagram" && connection.status === "connected") : null;
  const attempt = await createPublishAttempt(userId, {
    retryOfId: retryAttemptId || null,
    accountName: instagram?.accountName || null,
    accountUsername: instagram?.accountUsername || null,
    mediaAssetId,
    caption,
  });
  if (!attempt.ok) return Response.json({ error: attempt.error }, { status: attempt.status });

  const result = await publishInstagramImage(userId, mediaAssetId, caption);
  if (result.ok) {
    await finishPublishAttempt(userId, attempt.data.id, { status: "published", providerMediaId: result.data.mediaId });
    await createNotification(userId, {
      type: "publish_succeeded",
      title: "Instagram'da yayınlandı",
      description: "Instagram paylaşımın başarıyla tamamlandı.",
      href: "/publish",
      metadata: { platform: "instagram", providerMediaId: result.data.mediaId },
    });
    return Response.json({ data: { ...result.data, attemptId: attempt.data.id } }, { status: 201 });
  }

  await finishPublishAttempt(userId, attempt.data.id, { status: "failed", errorCode: result.code, errorMessage: result.error });
  await createNotification(userId, {
    type: result.code === "connection_expired" ? "connection_expired" : "publish_failed",
    title: result.code === "connection_expired" ? "Instagram bağlantısını yenile" : "Instagram paylaşımı başarısız",
    description: result.error,
    href: result.code === "connection_expired" ? "/connections" : "/publish",
    metadata: { platform: "instagram", errorCode: result.code },
  });
  return Response.json({ error: result.error, code: result.code }, { status: result.status });
}
