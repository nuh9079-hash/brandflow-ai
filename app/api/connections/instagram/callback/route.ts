import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { exchangeInstagramCode, getInstagramProfile, markInstagramConnectionError, safeInstagramError, saveInstagramConnection, validateInstagramState } from "@/lib/social/instagram";

function redirect(request: Request, result: "connected" | "error", code?: string) {
  const url = new URL("/connections", process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin);
  url.searchParams.set("instagram", result);
  if (result === "error" && code) url.searchParams.set("code", code);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const state = url.searchParams.get("state") || "";
  const code = url.searchParams.get("code") || "";
  const providerDenied = url.searchParams.has("error");
  const cookieStore = await cookies();
  const stateCookie = cookieStore.get("brandflow_instagram_oauth")?.value;
  cookieStore.delete("brandflow_instagram_oauth");
  let verifiedUserId: string | null = null;

  console.info("Instagram OAuth callback state:", {
    origin: url.origin,
    stateCookiePresent: Boolean(stateCookie),
  });

  try {
    const stateSession = validateInstagramState(state, stateCookie);
    if (!stateSession) throw new Error("invalid_state");
    verifiedUserId = stateSession.userId;
    if (providerDenied) throw new Error("access_denied");
    if (!code) throw new Error("code_missing");
    const token = await exchangeInstagramCode(code);
    const profile = await getInstagramProfile(token.accessToken);
    const saved = await saveInstagramConnection(verifiedUserId, token, profile);
    if (!saved.ok) {
      await markInstagramConnectionError(verifiedUserId, saved.code);
      return redirect(request, "error", saved.code);
    }
    return redirect(request, "connected");
  } catch (error) {
    const simpleCode = error instanceof Error && ["invalid_state", "access_denied", "code_missing"].includes(error.message) ? error.message : null;
    const safe = simpleCode ? { code: simpleCode } : safeInstagramError(error);
    if (verifiedUserId) await markInstagramConnectionError(verifiedUserId, safe.code);
    return redirect(request, "error", safe.code);
  }
}
