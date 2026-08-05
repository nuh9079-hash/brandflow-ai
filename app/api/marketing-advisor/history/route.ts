import { auth } from "@clerk/nextjs/server";
import { deleteStrategyReport, listStrategyReports } from "@/lib/marketing/strategy";

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Giriş yapmalısın." }, { status: 401 });
  const limit = Number(new URL(request.url).searchParams.get("limit") || 30);
  const result = await listStrategyReports(userId, limit);
  return result.ok ? Response.json({ data: result.data }) : Response.json({ error: result.error }, { status: result.status });
}

export async function DELETE(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Giriş yapmalısın." }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id")?.trim();
  if (!id) return Response.json({ error: "Rapor kimliği gerekli." }, { status: 400 });
  const result = await deleteStrategyReport(userId, id);
  return result.ok ? Response.json({ data: result.data }) : Response.json({ error: result.error }, { status: result.status });
}
