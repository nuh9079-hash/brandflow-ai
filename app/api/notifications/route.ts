import { auth } from "@clerk/nextjs/server";
import { listNotifications, markNotificationsRead } from "@/lib/notifications/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Bildirimleri görmek için giriş yapmalısın." }, { status: 401 });
  const result = await listNotifications(userId);
  return result.ok ? Response.json({ data: result.data }) : Response.json({ error: result.error }, { status: result.status });
}

export async function PATCH(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Bildirimleri güncellemek için giriş yapmalısın." }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { id?: unknown };
  const id = typeof body.id === "string" ? body.id.trim().slice(0, 120) : undefined;
  const result = await markNotificationsRead(userId, id);
  return result.ok ? Response.json({ data: result.data }) : Response.json({ error: result.error }, { status: result.status });
}
