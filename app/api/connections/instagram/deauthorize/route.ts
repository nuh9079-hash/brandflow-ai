import { deleteInstagramConnectionByPlatformAccountId, parseInstagramSignedRequest, safeInstagramError } from "@/lib/social/instagram";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const signedRequest = form.get("signed_request");
    if (typeof signedRequest !== "string") {
      return Response.json({ error: "signed_request gerekli." }, { status: 400 });
    }
    const payload = parseInstagramSignedRequest(signedRequest);
    await deleteInstagramConnectionByPlatformAccountId(payload.platformAccountId);
    return Response.json({ success: true });
  } catch (error) {
    const safe = safeInstagramError(error);
    console.error("Instagram deauthorize callback failed:", { code: safe.code, status: safe.status });
    return Response.json({ error: safe.message, code: safe.code }, { status: safe.status });
  }
}
