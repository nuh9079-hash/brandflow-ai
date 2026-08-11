import {
  createInstagramDeletionConfirmation,
  deleteInstagramConnectionByPlatformAccountId,
  parseInstagramSignedRequest,
  safeInstagramError,
  validateInstagramDeletionConfirmation,
} from "@/lib/social/instagram";

function callbackOrigin(request: Request) {
  return process.env.NEXT_PUBLIC_APP_URL?.trim() || new URL(request.url).origin;
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const signedRequest = form.get("signed_request");
    if (typeof signedRequest !== "string") {
      return Response.json({ error: "signed_request gerekli." }, { status: 400 });
    }
    const payload = parseInstagramSignedRequest(signedRequest);
    await deleteInstagramConnectionByPlatformAccountId(payload.platformAccountId);
    const confirmationCode = createInstagramDeletionConfirmation(payload.platformAccountId);
    const statusUrl = new URL("/api/connections/instagram/data-deletion", callbackOrigin(request));
    statusUrl.searchParams.set("code", confirmationCode);
    return Response.json({ url: statusUrl.toString(), confirmation_code: confirmationCode });
  } catch (error) {
    const safe = safeInstagramError(error);
    console.error("Instagram data deletion callback failed:", { code: safe.code, status: safe.status });
    return Response.json({ error: safe.message, code: safe.code }, { status: safe.status });
  }
}

export function GET(request: Request) {
  try {
    const code = new URL(request.url).searchParams.get("code") || "";
    if (!validateInstagramDeletionConfirmation(code)) {
      return Response.json({ error: "Silme isteği doğrulanamadı." }, { status: 400 });
    }
    return Response.json({ status: "completed", confirmation_code: code }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const safe = safeInstagramError(error);
    return Response.json({ error: safe.message, code: safe.code }, { status: safe.status });
  }
}
