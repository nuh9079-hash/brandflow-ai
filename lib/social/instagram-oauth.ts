const graphVersion = process.env.INSTAGRAM_GRAPH_API_VERSION || "v23.0";

function required(name: "INSTAGRAM_CLIENT_ID" | "INSTAGRAM_CLIENT_SECRET" | "INSTAGRAM_REDIRECT_URI") {
  const value = process.env[name];
  if (!value) throw new Error(`${name} eksik.`);
  return value;
}

export function instagramOAuthConfigured() {
  return Boolean(process.env.INSTAGRAM_CLIENT_ID && process.env.INSTAGRAM_CLIENT_SECRET && process.env.INSTAGRAM_REDIRECT_URI);
}

export function instagramAuthorizationUrl(state: string) {
  const url = new URL(`https://www.facebook.com/${graphVersion}/dialog/oauth`);
  url.searchParams.set("client_id", required("INSTAGRAM_CLIENT_ID"));
  url.searchParams.set("redirect_uri", required("INSTAGRAM_REDIRECT_URI"));
  url.searchParams.set("state", state);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "pages_show_list,pages_read_engagement,instagram_basic,instagram_content_publish");
  return url.toString();
}

type TokenResponse = { access_token?: string; expires_in?: number; error?: { message?: string } };
type Page = { id: string; name?: string; access_token?: string; instagram_business_account?: { id?: string } };

async function json<T>(url: URL) {
  const response = await fetch(url, { cache: "no-store" });
  const body = await response.json() as T;
  if (!response.ok) throw new Error("Instagram bağlantı servisi isteği başarısız oldu.");
  return body;
}

export async function exchangeInstagramCode(code: string) {
  const shortUrl = new URL(`https://graph.facebook.com/${graphVersion}/oauth/access_token`);
  shortUrl.searchParams.set("client_id", required("INSTAGRAM_CLIENT_ID"));
  shortUrl.searchParams.set("client_secret", required("INSTAGRAM_CLIENT_SECRET"));
  shortUrl.searchParams.set("redirect_uri", required("INSTAGRAM_REDIRECT_URI"));
  shortUrl.searchParams.set("code", code);
  const shortToken = await json<TokenResponse>(shortUrl);
  if (!shortToken.access_token) throw new Error(shortToken.error?.message || "Instagram erişim anahtarı alınamadı.");

  const longUrl = new URL(`https://graph.facebook.com/${graphVersion}/oauth/access_token`);
  longUrl.searchParams.set("grant_type", "fb_exchange_token");
  longUrl.searchParams.set("client_id", required("INSTAGRAM_CLIENT_ID"));
  longUrl.searchParams.set("client_secret", required("INSTAGRAM_CLIENT_SECRET"));
  longUrl.searchParams.set("fb_exchange_token", shortToken.access_token);
  const longToken = await json<TokenResponse>(longUrl).catch(() => shortToken);
  const accessToken = longToken.access_token || shortToken.access_token;

  const pagesUrl = new URL(`https://graph.facebook.com/${graphVersion}/me/accounts`);
  pagesUrl.searchParams.set("fields", "id,name,access_token,instagram_business_account");
  pagesUrl.searchParams.set("access_token", accessToken);
  const pages = await json<{ data?: Page[]; error?: { message?: string } }>(pagesUrl);
  const page = pages.data?.find((item) => item.instagram_business_account?.id && item.access_token);
  if (!page?.instagram_business_account?.id || !page.access_token) {
    throw new Error("Bağlı bir Instagram profesyonel hesabı bulunamadı. Instagram hesabını bir Facebook Sayfasına bağla.");
  }

  const expiresIn = longToken.expires_in || shortToken.expires_in;
  return {
    instagramAccountId: page.instagram_business_account.id,
    pageId: page.id,
    accountName: page.name || "Instagram",
    accessToken: page.access_token,
    tokenExpiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null,
  };
}
