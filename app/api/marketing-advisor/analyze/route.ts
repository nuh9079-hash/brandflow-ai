import { auth } from "@clerk/nextjs/server";
import { checkUsage, recordUsage } from "@/lib/billing/server";
import { createStrategyReport, sanitizeStrategyInput } from "@/lib/marketing/strategy";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Analiz oluşturmak için giriş yapmalısın." }, { status: 401 });
  const access = await checkUsage(userId, "advisor_analyses");
  if (!access.ok) return Response.json({ error: access.error }, { status: access.status });
  const input = sanitizeStrategyInput(await request.json());
  if (!input) return Response.json({ error: "İşletme, sektör, hedef kitle, hedefler ve platformlar zorunludur." }, { status: 400 });
  const result = await createStrategyReport(userId, input);
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
  const usage = await recordUsage(userId, "advisor_analyses", `strategy-advisor:${result.data.id}`);
  if (!usage.ok) return Response.json({ error: usage.error }, { status: usage.status });
  return Response.json({ data: result.data }, { status: 201 });
}
