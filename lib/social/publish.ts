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

function usesInstagramBusinessLogin(metadata: Record<string, unknown>) {
  const scopes = Array.isArray(metadata.granted_scopes) ? metadata.granted_scopes.map(String) : [];
  return scopes.some((scope) => scope.startsWith("instagram_business_"));
}

async function instagramFormPost<T>(url: string, token: string, fields: Record<string, string>) {
  const body = new FormData();
  Object.entries(fields).forEach(([key, value]) => body.set(key, value));
  const response = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body, cache: "no-store" });
  const payload = await response.json().catch(() => ({})) as T & { error?: { message?: string; code?: number } };
  return { response, payload };
}

async function publishInstagramDirect(post: ScheduledPost, accessToken: string, accountId: string): Promise<PublishOutcome> {
  if (!post.media?.storagePath) return { ok: false, status: 400, error: "Instagram paylaşımı için görsel veya video seçmelisin." };
  const signed = await createSignedMediaUrl(post.clerkUserId, post.media.storagePath);
  if (!signed.ok) return { ok: false, status: signed.status, error: signed.error };
  const fields: Record<string, string> = { caption: post.caption || "" };
  if (post.media.type === "video") { fields.media_type = "REELS"; fields.video_url = signed.data.signedUrl; }
  else fields.image_url = signed.data.signedUrl;
  const created = await instagramFormPost<{ id?: string }>(`https://graph.instagram.com/${encodeURIComponent(accountId)}/media`, accessToken, fields);
  if (!created.response.ok || !created.payload.id) return { ok: false, status: created.response.status || 502, error: metaError(created.payload, "Instagram medya hazırlığı başarısız oldu.") };
  for (let i = 0; i < 15; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const statusUrl = `https://graph.instagram.com/${encodeURIComponent(created.payload.id)}?fields=status_code,status`;
    const statusResponse = await fetch(statusUrl, { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
    const statusBody = await statusResponse.json().catch(() => ({})) as { status_code?: string; status?: string; error?: { message?: string } };
    if (!statusResponse.ok) return { ok: false, status: statusResponse.status || 502, error: metaError(statusBody, "Instagram medya durumu alınamadı.") };
    if (statusBody.status_code === "FINISHED") break;
    if (statusBody.status_code === "ERROR" || statusBody.status_code === "EXPIRED") return { ok: false, status: 502, error: statusBody.status || "Instagram medyayı işleyemedi." };
    if (i === 14) return { ok: false, status: 504, error: "Instagram medya işleme süresi uzadı. BrandFlow otomatik olarak tekrar deneyecek." };
  }
  const published = await instagramFormPost<{ id?: string }>(`https://graph.instagram.com/${encodeURIComponent(accountId)}/media_publish`, accessToken, { creation_id: created.payload.id });
  if (!published.response.ok || !published.payload.id) return { ok: false, status: published.response.status || 502, error: metaError(published.payload, "Instagram paylaşımı tamamlanamadı.") };
  return { ok: true, externalId: published.payload.id, publishedAt: new Date().toISOString() };
}

async function publishInstagramMeta(post: ScheduledPost, accessToken: string, accountId: string): Promise<PublishOutcome> {
  if (!post.media?.storagePath) return { ok: false, status: 400, error: "Instagram paylaşımı için görsel veya video seçmelisin." };
  const signed = await createSignedMediaUrl(post.clerkUserId, post.media.storagePath);
  if (!signed.ok) return { ok: false, status: signed.status, error: signed.error };
  const createUrl = `https://graph.facebook.com/${graphVersion}/${accountId}/media`;
  const params = new URLSearchParams({ access_token: accessToken, caption: post.caption || "" });
  if (post.media.type === "video") { params.set("media_type", "REELS"); params.set("video_url", signed.data.signedUrl); }
  else params.set("image_url", signed.data.signedUrl);
  const createdResponse = await fetch(createUrl, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: params });
  const created = await createdResponse.json().catch(() => ({})) as { id?: string; error?: { message?: string } };
  if (!createdResponse.ok || !created.id) return { ok: false, status: createdResponse.status || 502, error: metaError(created, "Instagram medya hazırlığı başarısız oldu.") };
  if (post.media.type === "video") {
    for (let i = 0; i < 12; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 2500));
      const statusUrl = new URL(`https://graph.facebook.com/${graphVersion}/${created.id}`);
      statusUrl.searchParams.set("fields", "status_code"); statusUrl.searchParams.set("access_token", accessToken);
      const statusResponse = await fetch(statusUrl, { cache: "no-store" });
      const statusBody = await statusResponse.json().catch(() => ({})) as { status_code?: string; error?: { message?: string } };
      if (statusBody.status_code === "FINISHED") break;
      if (statusBody.status_code === "ERROR" || statusBody.status_code === "EXPIRED") return { ok: false, status: 502, error: "Instagram videoyu işleyemedi. Videoyu yeniden yükleyip tekrar dene." };
      if (i === 11) return { ok: false, status: 504, error: "Instagram video işleme süresi uzadı. BrandFlow otomatik olarak tekrar deneyecek." };
    }
  }
  const publishParams = new URLSearchParams({ access_token: accessToken, creation_id: created.id });
  const publishedResponse = await fetch(`https://graph.facebook.com/${graphVersion}/${accountId}/media_publish`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: publishParams });
  const published = await publishedResponse.json().catch(() => ({})) as { id?: string; error?: { message?: string } };
  if (!publishedResponse.ok || !published.id) return { ok: false, status: publishedResponse.status || 502, error: metaError(published, "Instagram paylaşımı tamamlanamadı.") };
  return { ok: true, externalId: published.id, publishedAt: new Date().toISOString() };
}

async function publishInstagram(post: ScheduledPost): Promise<PublishOutcome> {
  const connection = await getSocialConnection(post.clerkUserId, "instagram");
  const accessToken = connection?.accessToken || process.env.INSTAGRAM_PUBLISH_ACCESS_TOKEN;
  const accountId = connection?.externalAccountId || process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
  if (!accessToken || !accountId) return { ok: false, status: 503, error: "Instagram hesabı yayın için bağlı değil. Sosyal Hesaplar bölümünden Instagram'ı bağla." };
  return connection && usesInstagramBusinessLogin(connection.metadata)
    ? publishInstagramDirect(post, accessToken, accountId)
    : publishInstagramMeta(post, accessToken, accountId);
}

async function publishFacebook(post: ScheduledPost): Promise<PublishOutcome> {
  const connection = await getSocialConnection(post.clerkUserId, "facebook");
  if (!connection?.accessToken || !connection.externalAccountId) return { ok: false, status: 503, error: "Facebook Sayfası otomatik yayın için bağlı değil. Sosyal Hesaplar bölümünden Meta hesabını yeniden bağla." };
  const accessToken = connection.accessToken; const pageId = connection.externalAccountId;
  let endpoint = `https://graph.facebook.com/${graphVersion}/${pageId}/feed`;
  const params = new URLSearchParams({ access_token: accessToken });
  if (!post.media?.storagePath) { if (!post.caption.trim()) return { ok: false, status: 400, error: "Facebook paylaşımı için metin veya medya eklemelisin." }; params.set("message", post.caption); }
  else {
    const signed = await createSignedMediaUrl(post.clerkUserId, post.media.storagePath); if (!signed.ok) return { ok: false, status: signed.status, error: signed.error };
    if (post.media.type === "video") { endpoint = `https://graph.facebook.com/${graphVersion}/${pageId}/videos`; params.set("file_url", signed.data.signedUrl); if (post.title.trim()) params.set("title", post.title.trim()); if (post.caption.trim()) params.set("description", post.caption.trim()); params.set("published", "true"); }
    else { endpoint = `https://graph.facebook.com/${graphVersion}/${pageId}/photos`; params.set("url", signed.data.signedUrl); if (post.caption.trim()) params.set("caption", post.caption.trim()); params.set("published", "true"); }
  }
  const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: params });
  const body = await response.json().catch(() => ({})) as { id?: string; post_id?: string; success?: boolean; error?: { message?: string } };
  const externalId = body.post_id || body.id;
  if (!response.ok || (!externalId && !body.success)) return { ok: false, status: response.status || 502, error: metaError(body, "Facebook paylaşımı tamamlanamadı.") };
  return { ok: true, externalId: externalId || `facebook-${Date.now()}`, publishedAt: new Date().toISOString() };
}

export async function publishScheduledPost(post: ScheduledPost): Promise<PublishOutcome> {
  if (post.platform === "instagram") return publishInstagram(post);
  if (post.platform === "facebook") return publishFacebook(post);
  return { ok: false, status: 503, error: `${post.platform} otomatik yayın sağlayıcısı henüz etkin değil. Bu plan başarısız olarak işaretlenmeden önce tekrar denenecek.` };
}
