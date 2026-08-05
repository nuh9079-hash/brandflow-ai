import { createCipheriv, createDecipheriv, createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const authorizeEndpoint = "https://www.instagram.com/oauth/authorize";
const tokenEndpoint = "https://api.instagram.com/oauth/access_token";
const graphEndpoint = "https://graph.instagram.com";
const stateLifetimeSeconds = 10 * 60;

type InstagramConfig = { appId: string; appSecret: string; redirectUri: string; encryptionKey: string };
type InstagramToken = { access_token?: string; user_id?: number | string; expires_in?: number; token_type?: string; permissions?: string[] };
type InstagramProfile = { id?: string; user_id?: string; username?: string; name?: string; account_type?: string };
type Result<T> = { ok: true; data: T } | { ok: false; status: number; code: string; error: string };
export type InstagramTestProfile = { id: string; username: string; accountType: string };

export class InstagramOAuthError extends Error {
  constructor(public readonly code: string, message: string, public readonly status = 500) { super(message); }
}

function configuration(): InstagramConfig {
  const values = {
    appId: process.env.META_APP_ID?.trim() || "",
    appSecret: process.env.META_APP_SECRET?.trim() || "",
    redirectUri: process.env.META_REDIRECT_URI?.trim() || "",
    encryptionKey: process.env.SOCIAL_TOKEN_ENCRYPTION_KEY?.trim() || "",
  };
  const missing = Object.entries(values).filter(([, value]) => !value).map(([key]) => key);
  if (missing.length) throw new InstagramOAuthError("configuration_missing", `Instagram OAuth yapılandırması eksik: ${missing.join(", ")}`, 503);
  if (values.encryptionKey.length < 32) throw new InstagramOAuthError("encryption_key_invalid", "SOCIAL_TOKEN_ENCRYPTION_KEY en az 32 karakter olmalıdır.", 503);
  return values;
}

function encryptionKey(secret: string) { return scryptSync(secret, "brandflow-social-token-v1", 32); }
export function encryptSocialToken(value: string) {
  const config = configuration(); const iv = randomBytes(12); const cipher = createCipheriv("aes-256-gcm", encryptionKey(config.encryptionKey), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}
export function decryptSocialToken(value: string) {
  const config = configuration(); const [version, iv, tag, encrypted] = value.split(".");
  if (version !== "v1" || !iv || !tag || !encrypted) throw new InstagramOAuthError("token_decryption_failed", "Kayıtlı sosyal hesap anahtarı okunamadı.");
  try {
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(config.encryptionKey), Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    throw new InstagramOAuthError("token_decryption_failed", "Kayıtlı sosyal hesap anahtarı çözülemedi.");
  }
}

export function createInstagramState(userId: string) {
  const config = configuration(); const state = randomBytes(32).toString("base64url"); const expires = Math.floor(Date.now() / 1000) + stateLifetimeSeconds;
  const payload = `${state}.${expires}`; const signature = createHmac("sha256", config.encryptionKey).update(`${payload}.${userId}`).digest("base64url");
  return { state, cookieValue: `${payload}.${signature}`, maxAge: stateLifetimeSeconds };
}

export function validateInstagramState(state: string, cookieValue: string | undefined, userId: string) {
  if (!state || !cookieValue) return false;
  const config = configuration(); const [cookieState, expiresValue, signature] = cookieValue.split(".");
  const expires = Number(expiresValue);
  if (!cookieState || !signature || state !== cookieState || !Number.isFinite(expires) || expires < Math.floor(Date.now() / 1000)) return false;
  const expected = createHmac("sha256", config.encryptionKey).update(`${cookieState}.${expires}.${userId}`).digest();
  const supplied = Buffer.from(signature, "base64url");
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export function instagramAuthorizationUrl(state: string) {
  const config = configuration();
  const url = new URL(authorizeEndpoint);
  url.searchParams.set("client_id", config.appId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "instagram_business_basic");
  url.searchParams.set("state", state);
  url.searchParams.set("enable_fb_login", "0");
  url.searchParams.set("force_authentication", "1");
  return url;
}

async function providerJson<T>(url: string, init: RequestInit, code: string): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store" });
  const body = await response.json().catch(() => ({})) as { error?: { message?: string; code?: number }; error_message?: string } & T;
  if (!response.ok) {
    console.error("Instagram OAuth provider error:", { endpoint: new URL(url).origin + new URL(url).pathname, status: response.status, providerCode: body.error?.code, providerMessage: body.error?.message || body.error_message });
    throw new InstagramOAuthError(code, "Instagram bağlantısı sağlayıcı tarafından tamamlanamadı.", 502);
  }
  return body;
}

export async function exchangeInstagramCode(code: string) {
  const config = configuration();
  const shortToken = await providerJson<InstagramToken>(tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: config.appId, client_secret: config.appSecret, grant_type: "authorization_code", redirect_uri: config.redirectUri, code }),
  }, "code_exchange_failed");
  if (!shortToken.access_token) throw new InstagramOAuthError("token_missing", "Instagram geçerli bir erişim anahtarı döndürmedi.", 502);

  const longToken = await providerJson<InstagramToken>(`${graphEndpoint}/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "ig_exchange_token", client_secret: config.appSecret, access_token: shortToken.access_token }),
  }, "long_token_exchange_failed");
  if (!longToken.access_token) throw new InstagramOAuthError("long_token_missing", "Instagram uzun süreli erişim anahtarı döndürmedi.", 502);
  return { accessToken: longToken.access_token, expiresIn: Number(longToken.expires_in || 5184000), permissions: Array.isArray(shortToken.permissions) ? shortToken.permissions : ["instagram_business_basic"] };
}

export async function getInstagramProfile(accessToken: string) {
  const profile = await providerJson<InstagramProfile>(`${graphEndpoint}/me?fields=id,user_id,username,name,account_type`, {
    method: "GET", headers: { Authorization: `Bearer ${accessToken}` },
  }, "profile_read_failed");
  const accountId = profile.user_id || profile.id;
  if (!accountId || !profile.username) throw new InstagramOAuthError("profile_invalid", "Instagram profesyonel hesap bilgileri alınamadı.", 502);
  return { accountId: String(accountId), username: profile.username, name: profile.name || profile.username, accountType: profile.account_type || "PROFESSIONAL" };
}

function safeProviderMessage(value: unknown) {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 240);
}

export async function testInstagramEnvironmentToken(): Promise<Result<InstagramTestProfile>> {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN?.trim();
  if (!accessToken) {
    return { ok: false, status: 503, code: "instagram_token_missing", error: "INSTAGRAM_ACCESS_TOKEN yapılandırılmamış." };
  }

  const endpoint = `${graphEndpoint}/me?fields=id,user_id,username,account_type`;
  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    const body = await response.json().catch(() => ({})) as InstagramProfile & {
      error?: { code?: number; message?: string; type?: string };
    };
    if (!response.ok) {
      const providerMessage = safeProviderMessage(body.error?.message);
      console.error("Instagram connection test failed:", {
        endpoint: `${graphEndpoint}/me`,
        status: response.status,
        providerCode: body.error?.code,
        providerType: body.error?.type,
        providerMessage,
      });
      return {
        ok: false,
        status: response.status === 401 || response.status === 403 ? 401 : 502,
        code: body.error?.code ? `instagram_${body.error.code}` : "instagram_profile_failed",
        error: providerMessage || "Instagram erişim anahtarı doğrulanamadı.",
      };
    }

    const id = body.user_id || body.id;
    if (!id || !body.username) {
      return { ok: false, status: 502, code: "instagram_profile_invalid", error: "Instagram güvenli profil alanlarını döndürmedi." };
    }
    return {
      ok: true,
      data: {
        id: String(id),
        username: body.username,
        accountType: body.account_type || "PROFESSIONAL",
      },
    };
  } catch (error) {
    console.error("Instagram connection test request failed:", error instanceof Error ? error.message : error);
    return { ok: false, status: 502, code: "instagram_request_failed", error: "Instagram API servisine şu anda ulaşılamıyor." };
  }
}

export async function saveInstagramConnection(userId: string, token: { accessToken: string; expiresIn: number; permissions: string[] }, profile: { accountId: string; username: string; name: string; accountType: string }): Promise<Result<{ id: string }>> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { ok: false, status: 503, code: "storage_unavailable", error: "Sosyal bağlantı veritabanı yapılandırılmamış." };
  const record = {
    clerk_user_id: userId, platform: "instagram", platform_account_id: profile.accountId, account_name: profile.name,
    account_username: profile.username, access_token_encrypted: encryptSocialToken(token.accessToken), refresh_token_encrypted: null,
    token_expires_at: new Date(Date.now() + token.expiresIn * 1000).toISOString(), status: "connected",
    metadata: { account_type: profile.accountType, granted_scopes: token.permissions.filter((item) => item.startsWith("instagram_")) },
    last_error: null, updated_at: new Date().toISOString(),
  };
  const { data: existing } = await supabase.from("social_connections").select("id").eq("clerk_user_id", userId).eq("platform", "instagram").eq("platform_account_id", profile.accountId).maybeSingle();
  const query = existing?.id
    ? supabase.from("social_connections").update(record).eq("id", existing.id).eq("clerk_user_id", userId).select("id").single()
    : supabase.from("social_connections").insert(record).select("id").single();
  const { data, error } = await query;
  if (error || !data) { console.error("Instagram connection save failed:", error?.message); return { ok: false, status: 500, code: "storage_failed", error: "Instagram bağlantısı güvenli biçimde kaydedilemedi." }; }
  return { ok: true, data: { id: String(data.id) } };
}

export async function markInstagramConnectionError(userId: string, code: string) {
  const supabase = getSupabaseServerClient(); if (!supabase) return;
  await supabase.from("social_connections").update({ status: "error", last_error: code, updated_at: new Date().toISOString() }).eq("clerk_user_id", userId).eq("platform", "instagram");
}

export async function disconnectInstagram(userId: string, connectionId?: string): Promise<Result<{ disconnected: true }>> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { ok: false, status: 503, code: "storage_unavailable", error: "Sosyal bağlantı veritabanı yapılandırılmamış." };
  let query = supabase.from("social_connections").select("id,access_token_encrypted,token_expires_at").eq("clerk_user_id", userId).eq("platform", "instagram");
  if (connectionId) query = query.eq("id", connectionId);
  const { data, error } = await query.order("updated_at", { ascending: false }).limit(1).maybeSingle();
  if (error || !data) return { ok: false, status: 404, code: "connection_not_found", error: "Instagram bağlantısı bulunamadı." };
  const expired = typeof data.token_expires_at === "string" && new Date(data.token_expires_at).getTime() <= Date.now();
  if (!expired && typeof data.access_token_encrypted === "string") {
    const accessToken = decryptSocialToken(data.access_token_encrypted);
    const response = await fetch(`${graphEndpoint}/me/permissions`, { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
    if (!response.ok) {
      const providerError = await response.json().catch(() => ({})) as { error?: { code?: number; message?: string } };
      console.error("Instagram revoke failed:", { status: response.status, providerCode: providerError.error?.code, providerMessage: providerError.error?.message });
      return { ok: false, status: 502, code: "revoke_failed", error: "Instagram erişimi sağlayıcı tarafında kaldırılamadı. Lütfen tekrar dene." };
    }
  }
  const { error: updateError } = await supabase.from("social_connections").update({ access_token_encrypted: null, refresh_token_encrypted: null, token_expires_at: null, status: "disconnected", last_error: null, updated_at: new Date().toISOString() }).eq("id", data.id).eq("clerk_user_id", userId);
  return updateError ? { ok: false, status: 500, code: "disconnect_failed", error: "Instagram bağlantısı güncellenemedi." } : { ok: true, data: { disconnected: true } };
}

export function safeInstagramError(error: unknown) {
  if (error instanceof InstagramOAuthError) return { code: error.code, message: error.message, status: error.status };
  console.error("Instagram OAuth unexpected error:", error);
  return { code: "unexpected_error", message: "Instagram bağlantısı tamamlanamadı.", status: 500 };
}
