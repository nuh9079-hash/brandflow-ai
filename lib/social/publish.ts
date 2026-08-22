import type { ScheduledPost } from "@/lib/calendar/types";
import { createSignedMediaUrl } from "@/lib/media/storage";
import { getSocialConnection } from "@/lib/social/connections";

export type PublishOutcome = { ok: true; externalId: string; publishedAt: string } | { ok: false; status: number; error: string };

const graphVersion = process.env.INSTAGRAM_GRAPH_API_VERSION || "v23.0";

function metaError(body: unknown, fallback: string) {
  if (body && typeof body === "object") {
    const error = (body as { error?: { message?: string } }).error;
    if (error?.message) return error.message;
  }
  return fallback;
}

async function publishInstagram(post: ScheduledPost): Promise<PublishOutcome> {
  if (!post.media?.storagePath) return { ok: false, status: 400, error: "Instagram paylaşımı için görsel veya video seçmelisin." };

  const connection = await getSocialConnection(post.clerkUserId, "instagram");
  const accessToken = connection?.accessToken || process.env.INSTAGRAM_PUBLISH_ACCESS_TOKEN;
  const accountId = connection?.externalAccountId || process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
  if (!accessToken || !accountId) return { ok: false, status: 503, error: "Instagram hesabı yayın için bağlı değil. Sosyal Hesaplar bölümünden Instagram'ı bağla." };

  const signed = await createSignedMediaUrl(post.clerkUserId, post.media.storagePath);
  if (!signed.ok) return { ok: false, status: signed.status, error: signed.error };

  const createUrl = `https://graph.facebook.com/${graphVersion}/${accountId}/media`;
  const params = new URLSearchParams({ access_token: accessToken, caption: post.caption || "" });
  if (post.media.type === "video") {
    params.set("media_type", "REELS");
    params.set("video_url", signed.data.signedUrl);
  } else {
    params.set("image_url", signed.data.signedUrl);
  }

  const createdResponse = await fetch(createUrl, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: params });
  const created = await createdResponse.json() as { id?: string; error?: { message?: string } };
  if (!createdResponse.ok || !created.id) return { ok: false, status: createdResponse.status || 502, error: metaError(created, "Instagram medya hazırlığı başarısız oldu.") };

  if (post.media.type === "video") {
    for (let i = 0; i < 12; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 2500));
      const statusUrl = new URL(`https://graph.facebook.com/${graphVersion}/${created.id}`);
      statusUrl.searchParams.set("fields", "status_code");
      statusUrl.searchParams.set("access_token", accessToken);
      const statusResponse = await fetch(statusUrl, { cache: "no-store" });
      const statusBody = await statusResponse.json() as { status_code?: string; error?: { message?: string } };
      if (statusBody.status_code === "FINISHED") break;
      if (statusBody.status_code === "ERROR" || statusBody.status_code === "EXPIRED") return { ok: false, status: 502, error: "Instagram videoyu işleyemedi. Videoyu yeniden yükleyip tekrar dene." };
      if (i === 11) return { ok: false, status: 504, error: "Instagram video işleme süresi uzadı. BrandFlow otomatik olarak tekrar deneyecek." };
    }
  }

  const publishParams = new URLSearchParams({ access_token: accessToken, creation_id: created.id });
  const publishedResponse = await fetch(`https://graph.facebook.com/${graphVersion}/${accountId}/media_publish`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: publishParams });
  const published = await publishedResponse.json() as { id?: string; error?: { message?: string } };
  if (!publishedResponse.ok || !published.id) return { ok: false, status: publishedResponse.status || 502, error: metaError(published, "Instagram paylaşımı tamamlanamadı.") };
  return { ok: true, externalId: published.id, publishedAt: new Date().toISOString() };
}

export async function publishScheduledPost(post: ScheduledPost): Promise<PublishOutcome> {
  if (post.platform === "instagram") return publishInstagram(post);
  return { ok: false, status: 503, error: `${post.platform} otomatik yayın sağlayıcısı henüz etkin değil. Bu plan başarısız olarak işaretlenmeden önce tekrar denenecek.` };
}
