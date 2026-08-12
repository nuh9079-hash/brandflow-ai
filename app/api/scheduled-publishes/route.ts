import { auth } from "@clerk/nextjs/server";
import { createScheduledPublish, listScheduledPublishes, sanitizeScheduledPublishInput } from "@/lib/scheduling/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Planlanan paylaşımları görmek için giriş yapmalısın." }, { status: 401 });
  const result = await listScheduledPublishes(userId);
  return result.ok ? Response.json({ data: result.data }) : Response.json({ error: result.error }, { status: result.status });
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Paylaşım planlamak için giriş yapmalısın." }, { status: 401 });
  const input = sanitizeScheduledPublishInput(await request.json().catch(() => null));
  if (!input.ok) return Response.json({ error: input.error }, { status: input.status });
  const result = await createScheduledPublish(userId, input.data);
  return result.ok ? Response.json({ data: result.data }, { status: 201 }) : Response.json({ error: result.error }, { status: result.status });
}
