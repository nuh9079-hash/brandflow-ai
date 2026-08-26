import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { instagramAuthorizationUrl, instagramOAuthConfigured } from "@/lib/social/instagram-oauth";

export async function GET() {
  await auth?.protect();
  if (!instagramOAuthConfigured()) return NextResponse?.redirect(new URL("/profiles?instagram=config-missing", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"));
  const state = crypto.randomUUID();
  const store = await cookies();
  store?.set("brandflow_instagram_oauth_state", state, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 600, path: "/" });
  return NextResponse?.redirect(instagramAuthorizationUrl(state));
}
