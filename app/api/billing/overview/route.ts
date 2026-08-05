import { auth } from "@clerk/nextjs/server";
import { getBillingOverview } from "@/lib/billing/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Billing bilgilerini görmek için giriş yapmalısın." }, { status: 401 });
  const result = await getBillingOverview(userId);
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
  return Response.json({ data: result.data });
}
