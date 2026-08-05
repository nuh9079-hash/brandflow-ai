import { auth } from "@clerk/nextjs/server";
import { getAnalyticsOverview } from "@/lib/analytics/server";
import { requireBillingFeature } from "@/lib/billing/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Analitik verilerini görmek için giriş yapmalısın." }, { status: 401 });
  const access = await requireBillingFeature(userId, "analytics");
  if (!access.ok) return Response.json({ error: access.error }, { status: access.status });
  const result = await getAnalyticsOverview(userId);
  return result.ok ? Response.json({ data: result.data }) : Response.json({ error: result.error }, { status: result.status });
}
