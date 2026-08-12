import { auth } from "@clerk/nextjs/server";
import { deleteDraft, getDraft } from "@/lib/drafts/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Taslağı görmek için giriş yapmalısın." }, { status: 401 });
  const { id } = await context.params;
  const result = await getDraft(userId, id);
  return result.ok ? Response.json({ data: result.data }) : Response.json({ error: result.error }, { status: result.status });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Taslak silmek için giriş yapmalısın." }, { status: 401 });
  const { id } = await context.params;
  const result = await deleteDraft(userId, id);
  return result.ok ? Response.json({ data: result.data }) : Response.json({ error: result.error }, { status: result.status });
}
