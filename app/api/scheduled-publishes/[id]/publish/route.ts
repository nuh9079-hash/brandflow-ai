import { auth } from "@clerk/nextjs/server";
import { processScheduledPublish } from "@/lib/scheduling/processor";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  const { userId } = await auth(); if (!userId) return Response.json({ error: "Giriş yapmalısın." }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { retry?: boolean };
  const result = await processScheduledPublish((await context.params).id, { retry: body.retry === true, expectedUserId: userId });
  return result.ok ? Response.json({ data: result.data }) : Response.json({ error: result.error, code: "code" in result ? result.code : undefined }, { status: result.status });
}
