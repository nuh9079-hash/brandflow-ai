import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createInstagramState, instagramAuthorizationUrl, safeInstagramError } from "@/lib/social/instagram";

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Instagram bağlamak için giriş yapmalısın." }, { status: 401 });
  try {
    const oauth = createInstagramState(userId);
    const cookieStore = await cookies();
    cookieStore.set("brandflow_instagram_oauth", oauth.cookieValue, {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax",
      path: "/api/connections/instagram/callback", maxAge: oauth.maxAge,
    });
    return NextResponse.redirect(instagramAuthorizationUrl(oauth.state));
  } catch (error) {
    const safe = safeInstagramError(error);
    if (process.env.NODE_ENV === "development") return Response.json({ error: safe.message, code: safe.code }, { status: safe.status });
    const appOrigin = process.env.NEXT_PUBLIC_APP_URL?.trim() || new URL(request.url).origin;
    return NextResponse.redirect(new URL(`/connections?instagram=error&code=${encodeURIComponent(safe.code)}`, appOrigin));
  }
}
