import { auth } from "@clerk/nextjs/server";
import { listPublishAttempts } from "@/lib/publishing/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Paylaşım geçmişini görmek için giriş yapmalısın." }, { status: 401 });
  const result = await listPublishAttempts(userId);
  return result.ok ? Response.json({ data: result.data }) : Response.json({ error: result.error }, { status: result.status });
}
