import { getMedia } from "@/lib/media/server";
import { createSignedMediaUrl } from "@/lib/media/storage";
import {
  getActiveInstagramConnection,
  getInstagramProfile,
  markInstagramConnectionExpired,
  safeInstagramError,
  updateStoredInstagramProfile,
} from "@/lib/social/instagram";

type PublishResult =
  | { ok: true; data: { mediaId: string } }
  | { ok: false; status: number; code: string; error: string };

type ProviderError = {
  message?: string;
  type?: string;
  code?: number;
  error_subcode?: number;
};

function safeMessage(value: unknown) {
  return typeof value === "string"
    ? value
      .replace(/https?:\/\/\S+/gi, "[URL]")
      .replace(/(access[_ -]?token|authorization)\s*[:=]\s*[^\s,}]+/gi, "$1=[REDACTED]")
      .replace(/[\u0000-\u001f\u007f]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 300)
    : "";
}

async function instagramPost<T>(stage: string, endpoint: string, token: string, fields: Record<string, string>) {
  const body = new FormData();
  Object.entries(fields).forEach(([key, value]) => body.set(key, value));
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body,
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({})) as T & { error?: ProviderError };
  if (!response.ok) {
    console.error("Instagram publishing provider error:", {
      stage,
      endpoint: new URL(endpoint).origin + new URL(endpoint).pathname,
      status: response.status,
      providerType: payload.error?.type,
      providerCode: payload.error?.code,
      providerSubcode: payload.error?.error_subcode,
      providerMessage: safeMessage(payload.error?.message),
    });
  }
  return { response, payload };
}

async function waitForContainer(containerId: string, token: string): Promise<PublishResult | { ok: true }> {
  const endpoint = `https://graph.instagram.com/${encodeURIComponent(containerId)}?fields=status_code,status`;
  for (let attempt = 0; attempt < 15; attempt += 1) {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ({})) as {
      status_code?: string;
      status?: string;
      error?: ProviderError;
    };
    if (!response.ok) {
      console.error("Instagram publishing provider error:", {
        stage: "media_container_status",
        endpoint: new URL(endpoint).origin + new URL(endpoint).pathname,
        status: response.status,
        providerType: payload.error?.type,
        providerCode: payload.error?.code,
        providerSubcode: payload.error?.error_subcode,
        providerMessage: safeMessage(payload.error?.message),
      });
      return {
        ok: false,
        status: payload.error?.code === 190 ? 401 : 502,
        code: payload.error?.code === 190 ? "connection_expired" : "container_status_failed",
        error: safeMessage(payload.error?.message) || "Instagram görsel hazırlık durumu alınamadı.",
      };
    }
    if (payload.status_code === "FINISHED") return { ok: true };
    if (payload.status_code === "ERROR" || payload.status_code === "EXPIRED") {
      return {
        ok: false,
        status: 502,
        code: "container_processing_failed",
        error: safeMessage(payload.status) || "Instagram görseli yayına hazırlayamadı.",
      };
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  return {
    ok: false,
    status: 504,
    code: "container_processing_timeout",
    error: "Instagram görseli zamanında yayına hazırlayamadı. Birkaç dakika sonra tekrar dene.",
  };
}

export async function publishInstagramImage(userId: string, mediaAssetId: string, caption: string): Promise<PublishResult> {
  const connection = await getActiveInstagramConnection(userId);
  if (!connection.ok) return connection;
  let accountId = connection.data.accountId;
  try {
    const profile = await getInstagramProfile(connection.data.accessToken);
    accountId = profile.accountId;
    if (accountId !== connection.data.accountId) {
      await updateStoredInstagramProfile(userId, connection.data.id, profile);
    }
  } catch (error) {
    const safe = safeInstagramError(error);
    if (safe.code === "profile_read_failed") {
      await markInstagramConnectionExpired(userId, connection.data.id, safe.code);
    }
    return { ok: false, status: safe.status, code: safe.code, error: safe.message };
  }

  const media = await getMedia(userId, mediaAssetId);
  if (!media.ok) return { ok: false, status: media.status, code: "media_unavailable", error: media.error };
  if (media.data.type !== "image" && media.data.type !== "logo") {
    return { ok: false, status: 400, code: "image_required", error: "Instagram paylaşımı için bir görsel seçmelisin." };
  }
  if (!media.data.storagePath) {
    return { ok: false, status: 404, code: "media_file_missing", error: "Seçilen görselin dosyası bulunamadı." };
  }
  const cleanCaption = caption.trim();
  if (!cleanCaption) return { ok: false, status: 400, code: "caption_required", error: "Instagram açıklaması boş olamaz." };
  if (cleanCaption.length > 2200) return { ok: false, status: 400, code: "caption_too_long", error: "Instagram açıklaması 2200 karakterden uzun olamaz." };

  const signed = await createSignedMediaUrl(userId, media.data.storagePath);
  if (!signed.ok) return { ok: false, status: signed.status, code: "media_url_failed", error: signed.error };

  const graphRoot = "https://graph.instagram.com";
  const containerEndpoint = `${graphRoot}/${encodeURIComponent(accountId)}/media`;
  const container = await instagramPost<{ id?: string }>("create_media_container", containerEndpoint, connection.data.accessToken, {
    image_url: signed.data.signedUrl,
    caption: cleanCaption,
  });
  if (!container.response.ok || !container.payload.id) {
    const providerCode = container.payload.error?.code;
    if (providerCode === 190) await markInstagramConnectionExpired(userId, connection.data.id, "instagram_token_invalid");
    return {
      ok: false,
      status: providerCode === 190 ? 401 : 502,
      code: providerCode === 190 ? "connection_expired" : "container_creation_failed",
      error: safeMessage(container.payload.error?.message) || "Instagram paylaşım kapsayıcısı oluşturulamadı.",
    };
  }

  const ready = await waitForContainer(container.payload.id, connection.data.accessToken);
  if (!ready.ok) {
    if (ready.code === "connection_expired") {
      await markInstagramConnectionExpired(userId, connection.data.id, "instagram_token_invalid");
    }
    return ready;
  }

  const publishEndpoint = `${graphRoot}/${encodeURIComponent(accountId)}/media_publish`;
  const published = await instagramPost<{ id?: string }>("publish_media_container", publishEndpoint, connection.data.accessToken, {
    creation_id: container.payload.id,
  });
  if (!published.response.ok || !published.payload.id) {
    const providerCode = published.payload.error?.code;
    if (providerCode === 190) await markInstagramConnectionExpired(userId, connection.data.id, "instagram_token_invalid");
    return {
      ok: false,
      status: providerCode === 190 ? 401 : 502,
      code: providerCode === 190 ? "connection_expired" : "media_publish_failed",
      error: safeMessage(published.payload.error?.message) || "Instagram paylaşımı tamamlanamadı.",
    };
  }

  return { ok: true, data: { mediaId: published.payload.id } };
}
