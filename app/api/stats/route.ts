import { auth } from "@clerk/nextjs/server";
import { getDashboardStats } from "@/lib/content-store";

export async function GET() {
  const { userId } = await auth?.protect();
  const stats = await getDashboardStats(userId);

  return Response.json({ stats });
}
