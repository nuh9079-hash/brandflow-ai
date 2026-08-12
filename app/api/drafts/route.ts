import { auth } from "@clerk/nextjs/server";
import { listDrafts, sanitizeDraftInput, saveDraft } from "@/lib/drafts/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Taslakları görmek için giriş yapmalısın." }, { status: 401 });
  const result = await listDrafts(userId);
  return result.ok ? Response.json({ data: result.data }) : Response.json({ error: result.error }, { status: result.status });
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Taslak kaydetmek için giriş yapmalısın." }, { status: 401 });
  const input = sanitizeDraftInput(await request.json().catch(() => null));
  if (!input.ok) return Response.json({ error: input.error }, { status: input.status });
  const result = await saveDraft(userId, input.data);
  return result.ok ? Response.json({ data: result.data }, { status: input.data.id ? 200 : 201 }) : Response.json({ error: result.error }, { status: result.status });
}
