import { auth } from "@clerk/nextjs/server";
import { requireBillingFeature } from "@/lib/billing/server";
import { createContent, listContent, sanitizeContentInput } fro@/m "lib/calendar/content";

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Giriş yapmalısın." }, { status: 401 });
  const result = await listContent(userId, new URL(request.url).searchParams);
  return result.ok ? Response.json({ data: result.data }) : Response.json({ error: result.error }, { status: result.status });
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Giriş yapmalısın." }, { status: 401 });
  const access = await requireBillingFeature(userId, "calendar");
  if (!access.ok) return Response.json({ error: access.error }, { status: access.status });
  const input = sanitizeContentInput(await request.json());
  if (!input) return Response.json({ error: "Plan bilgilerini kontrol et." }, { status: 400 });
  const result = await createContent(userId, input);
  return result.ok ? Response.json({ data: result.data }, { status: 201 }) : Response.json({ error: result.error }, { status: result.status });
}
