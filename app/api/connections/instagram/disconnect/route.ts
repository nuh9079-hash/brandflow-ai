import { auth } from "@clerk/nextjs/server";
import { disconnectInstagram } from "@/lib/social/instagram";
import { createNotification } from "@/lib/notifications/server";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Instagram bağlantısını kaldırmak için giriş yapmalısın." }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { connectionId?: string };
  const result = await disconnectInstagram(userId, body.connectionId);
  if (!result.ok) return Response.json({ error: result.error, code: result.code }, { status: result.status });
  await createNotification(userId, {
    type: "connection_disconnected",
    title: "Instagram bağlantısı kesildi",
    description: "Instagram hesabı BrandFlow bağlantılarından kaldırıldı.",
    href: "/connections",
    metadata: { platform: "instagram" },
  });
  return Response.json({ data: result.data });
}
