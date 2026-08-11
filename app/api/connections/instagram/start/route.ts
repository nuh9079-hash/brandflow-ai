import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createInstagramState, instagramAuthorizationUrl, instagramRedirectUri, safeInstagramError } from "@/lib/social/instagram";

function externalRequestOrigin(request: Request) {
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (forwardedHost && (forwardedProto === "http" || forwardedProto === "https")) {
    return `${forwardedProto}://${forwardedHost}`;
  }
  return new URL(request.url).origin;
}

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Instagram bağlamak için giriş yapmalısın." }, { status: 401 });
  try {
    const requestOrigin = externalRequestOrigin(request);
    const oauthOrigin = new URL(instagramRedirectUri()).origin;
    if (requestOrigin !== oauthOrigin) {
      throw new Error("oauth_origin_mismatch");
    }
    const oauth = createInstagramState(userId);
    const cookieStore = await cookies();
    cookieStore.set("brandflow_instagram_oauth", oauth.cookieValue, {
      httpOnly: true, secure: oauthOrigin.startsWith("https://"), sameSite: "lax",
      path: "/api/connections/instagram/callback", maxAge: oauth.maxAge,
    });
    return NextResponse.redirect(instagramAuthorizationUrl(oauth.state));
  } catch (error) {
    if (error instanceof Error && error.message === "oauth_origin_mismatch") {
      return Response.json({ error: "Instagram bağlantısını configured ngrok adresindeki BrandFlow sayfasından başlatmalısın.", code: "oauth_origin_mismatch" }, { status: 409 });
    }
    const safe = safeInstagramError(error);
    if (process.env.NODE_ENV === "development") return Response.json({ error: safe.message, code: safe.code }, { status: safe.status });
    const appOrigin = process.env.NEXT_PUBLIC_APP_URL?.trim() || new URL(request.url).origin;
    return NextResponse.redirect(new URL(`/connections?instagram=error&code=${encodeURIComponent(safe.code)}`, appOrigin));
  }
}
