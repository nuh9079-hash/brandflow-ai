import { auth } from "@clerk/nextjs/server";
import { getAnalyticsOverview, parseAnalyticsFilters } from "@/lib/analytics/server";

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Analitik verilerini görmek için giriş yapmalısın." }, { status: 401 });

  const result = await getAnalyticsOverview(userId, parseAnalyticsFilters(new URL(request.url).searchParams));
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
  return Response.json({ data: result.data });
}
