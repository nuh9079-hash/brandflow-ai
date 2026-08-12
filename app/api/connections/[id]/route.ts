import { auth } from "@clerk/nextjs/server";
import { deleteSocialConnection } from "@/lib/social/connections";
import { createNotification } from "@/lib/notifications/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Giriş yapmalısın." }, { status: 401 });
  const { id } = await context.params;
  if (!id) return Response.json({ error: "Bağlantı kimliği geçersiz." }, { status: 400 });
  const result = await deleteSocialConnection(userId, id);
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
  await createNotification(userId, {
    type: "connection_disconnected",
    title: "Sosyal hesap bağlantısı kesildi",
    description: "Sosyal hesap BrandFlow bağlantılarından kaldırıldı.",
    href: "/connections",
    metadata: { connectionId: id },
  });
  return Response.json({ data: result.data });
}
