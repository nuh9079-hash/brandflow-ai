import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { exchangeInstagramCode } from "@/lib/social/instagram-oauth";
import { upsertSocialConnection } from "@/lib/social/connections";

export async function GET(request: Request) {
  const { userId } = await auth.protect();
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const store = await cookies();
  const expected = store.get("brandflow_instagram_oauth_state")?.value;
  store.delete("brandflow_instagram_oauth_state");
  const base = process.env.NEXT_PUBLIC_APP_URL || url.origin;

  if (!code || !state || !expected || state !== expected) {
    return NextResponse.redirect(new URL("/profiles?instagram=state-error", base));
  }

  try {
    const account = await exchangeInstagramCode(code);
    await upsertSocialConnection({
      userId,
      platform: "instagram",
      externalAccountId: account.instagramAccountId,
      accountName: account.accountName,
      accountUsername: account.accountUsername,
      accessToken: account.accessToken,
      tokenExpiresAt: account.tokenExpiresAt,
      metadata: {
        account_type: account.accountType,
        granted_scopes: account.grantedScopes,
        connection_mode: "instagram_business_login",
      },
    });
    return NextResponse.redirect(new URL("/profiles?instagram=connected", base));
  } catch (error) {
    console.error("instagram oauth callback", error instanceof Error ? error.message : error);
    return NextResponse.redirect(
      new URL(`/profiles?instagram=error&reason=${encodeURIComponent(error instanceof Error ? error.message : "Bağlantı kurulamadı")}`, base),
    );
  }
}
