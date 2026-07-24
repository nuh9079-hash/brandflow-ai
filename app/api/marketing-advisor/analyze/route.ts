import { auth } from "@clerk/nextjs/server";
import { analyzeMarketingAsset, listAdvisorReports, sanitizeAdvisorInput } from "@/lib/marketing/advisor";

function advisorError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export async function GET(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return advisorError("AI Marketing Advisor için giriş yapmalısın.", 401);
  }

  const limit = Number(new URL(req.url).searchParams.get("limit") || 5);
  const result = await listAdvisorReports(userId, limit);

  if (!result.ok) {
    return advisorError(result.error, result.status);
  }

  return Response.json({ data: result.data });
}

export async function POST(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return advisorError("Analiz oluşturmak için giriş yapmalısın.", 401);
  }

  const input = sanitizeAdvisorInput(await req.json());

  if (!input) {
    return advisorError("Analiz için medya, platform ve içerik bilgilerini kontrol et.", 400);
  }

  const result = await analyzeMarketingAsset(userId, input);

  if (!result.ok) {
    return advisorError(result.error, result.status);
  }

  return Response.json({ data: result.data });
}
