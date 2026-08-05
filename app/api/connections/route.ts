import { auth } from "@clerk/nextjs/server";
import { listSocialConnections } from "@/lib/social/connections";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return Response.json({ error: "Giriş yapmalısın." }, { status: 401 });
    const result = await listSocialConnections(userId);
    if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
    return Response.json({ data: result.data });
  } catch (error) {
    console.error("Connections API unexpected error", {
      name: error instanceof Error ? error.name : null,
      stack: error instanceof Error ? error.stack : null,
      message: error instanceof Error ? error.message : String(error),
      code: error && typeof error === "object" && "code" in error ? String(error.code) : null,
      details: error && typeof error === "object" && "details" in error ? String(error.details) : null,
      hint: error && typeof error === "object" && "hint" in error ? String(error.hint) : null,
    });
    return Response.json({ error: "Sosyal bağlantılar beklenmeyen bir hata nedeniyle yüklenemedi." }, { status: 500 });
  }
}

export async function POST() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Giriş yapmalısın." }, { status: 401 });
  return Response.json({ error: "OAuth bağlantısı sonraki adımda etkinleştirilecek." }, { status: 501 });
}
