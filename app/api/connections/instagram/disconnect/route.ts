import { auth } from "@clerk/nextjs/server";
import { disconnectInstagram } from "@/lib/social/instagram";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Instagram bağlantısını kaldırmak için giriş yapmalısın." }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { connectionId?: string };
  const result = await disconnectInstagram(userId, body.connectionId);
  return result.ok ? Response.json({ data: result.data }) : Response.json({ error: result.error, code: result.code }, { status: result.status });
}
