const authorizeEndpoint = "https://www.instagram.com/oauth/authorize";
const tokenEndpoint = "https://api.instagram.com/oauth/access_token";
const graphEndpoint = "https://graph.instagram.com";

const requestedScopes = [
  "instagram_business_basic",
  "instagram_business_content_publish",
  "instagram_business_manage_insights",
];

function required(name: "INSTAGRAM_CLIENT_ID" | "INSTAGRAM_CLIENT_SECRET" | "INSTAGRAM_REDIRECT_URI") {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} eksik.`);
  return value;
}

export function instagramOAuthConfigured() {
  return Boolean(
    process.env.INSTAGRAM_CLIENT_ID?.trim() &&
    process.env.INSTAGRAM_CLIENT_SECRET?.trim() &&
    process.env.INSTAGRAM_REDIRECT_URI?.trim(),
  );
}

export function instagramAuthorizationUrl(state: string) {
  const url = new URL(authorizeEndpoint);
  url.searchParams.set("client_id", required("INSTAGRAM_CLIENT_ID"));
  url.searchParams.set("redirect_uri", required("INSTAGRAM_REDIRECT_URI"));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", requestedScopes.join(","));
  url.searchParams.set("state", state);
  url.searchParams.set("enable_fb_login", "0");
  url.searchParams.set("force_authentication", "1");
  return url.toString();
}

type ShortTokenResponse = {
  access_token?: string;
  user_id?: string | number;
  permissions?: string[];
  error_type?: string;
  code?: number;
  error_message?: string;
};

type LongTokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: { message?: string };
};

type ProfileResponse = {
  id?: string;
  user_id?: string;
  username?: string;
  name?: string;
  account_type?: string;
  error?: { message?: string };
};

async function responseJson<T>(response: Response, fallback: string): Promise<T> {
  const body = await response.json().catch(() => ({})) as T & {
    error?: { message?: string };
    error_message?: string;
  };
  if (!response.ok) {
    const message = body.error?.message || body.error_message || fallback;
    throw new Error(message);
  }
  return body;
}

export async function exchangeInstagramCode(code: string) {
  const shortBody = new URLSearchParams({
    client_id: required("INSTAGRAM_CLIENT_ID"),
    client_secret: required("INSTAGRAM_CLIENT_SECRET"),
    grant_type: "authorization_code",
    redirect_uri: required("INSTAGRAM_REDIRECT_URI"),
    code,
  });

  const shortResponse = await fetch(tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: shortBody,
    cache: "no-store",
  });
  const shortToken = await responseJson<ShortTokenResponse>(shortResponse, "Instagram erişim anahtarı alınamadı.");
  if (!shortToken.access_token) throw new Error("Instagram geçerli bir erişim anahtarı döndürmedi.");

  const longUrl = new URL(`${graphEndpoint}/access_token`);
  longUrl.searchParams.set("grant_type", "ig_exchange_token");
  longUrl.searchParams.set("client_secret", required("INSTAGRAM_CLIENT_SECRET"));
  longUrl.searchParams.set("access_token", shortToken.access_token);
  const longResponse = await fetch(longUrl, { cache: "no-store" });
  const longToken = await responseJson<LongTokenResponse>(longResponse, "Instagram uzun süreli erişim anahtarı alınamadı.");
  if (!longToken.access_token) throw new Error("Instagram uzun süreli erişim anahtarı döndürmedi.");

  const profileUrl = new URL(`${graphEndpoint}/me`);
  profileUrl.searchParams.set("fields", "id,user_id,username,name,account_type");
  const profileResponse = await fetch(profileUrl, {
    headers: { Authorization: `Bearer ${longToken.access_token}` },
    cache: "no-store",
  });
  const profile = await responseJson<ProfileResponse>(profileResponse, "Instagram hesap bilgileri alınamadı.");
  const accountId = profile.id || profile.user_id;
  if (!accountId || !profile.username) {
    throw new Error("Instagram profesyonel hesap bilgileri alınamadı. Business veya Creator hesabı kullanmalısın.");
  }

  const expiresIn = Number(longToken.expires_in || 5_184_000);
  return {
    instagramAccountId: String(accountId),
    accountName: profile.name || profile.username,
    accountUsername: profile.username,
    accountType: profile.account_type || "PROFESSIONAL",
    accessToken: longToken.access_token,
    tokenExpiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
    grantedScopes: Array.isArray(shortToken.permissions) && shortToken.permissions.length
      ? shortToken.permissions
      : requestedScopes,
  };
}
