import { auth } from "@clerk/nextjs/server";
import { cancelScheduledPublish, getScheduledPublish, sanitizeScheduledPublishInput, updateScheduledPublish } from "@/lib/scheduling/server";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  const { userId } = await auth(); if (!userId) return Response.json({ error: "Giriş yapmalısın." }, { status: 401 });
  const result = await getScheduledPublish(userId, (await context.params).id);
  return result.ok ? Response.json({ data: result.data }) : Response.json({ error: result.error }, { status: result.status });
}

export async function PATCH(request: Request, context: Context) {
  const { userId } = await auth(); if (!userId) return Response.json({ error: "Giriş yapmalısın." }, { status: 401 });
  const input = sanitizeScheduledPublishInput(await request.json().catch(() => null)); if (!input.ok) return Response.json({ error: input.error }, { status: input.status });
  const result = await updateScheduledPublish(userId, (await context.params).id, input.data);
  return result.ok ? Response.json({ data: result.data }) : Response.json({ error: result.error }, { status: result.status });
}

export async function DELETE(_request: Request, context: Context) {
  const { userId } = await auth(); if (!userId) return Response.json({ error: "Giriş yapmalısın." }, { status: 401 });
  const result = await cancelScheduledPublish(userId, (await context.params).id);
  return result.ok ? Response.json({ data: result.data }) : Response.json({ error: result.error }, { status: result.status });
}
