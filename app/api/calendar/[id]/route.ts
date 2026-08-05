import { auth } from "@clerk/nextjs/server";
import { requireBillingFeature } from "@/lib/billing/server";
import { deleteContent, duplicateContent, sanitizeContentUpdate, updateContent } from "@/lib/calendar/content";

type Context = { params: Promise<{ id: string }> };

async function identify(context: Context) { return (await context.params).id; }
async function authorize() {
  const { userId } = await auth();
  if (!userId) return { error: Response.json({ error: "Giriş yapmalısın." }, { status: 401 }) };
  const access = await requireBillingFeature(userId, "calendar");
  if (!access.ok) return { error: Response.json({ error: access.error }, { status: access.status }) };
  return { userId };
}

export async function PATCH(request: Request, context: Context) {
  const authorization = await authorize(); if ("error" in authorization) return authorization.error;
  const input = sanitizeContentUpdate(await request.json());
  if (!input) return Response.json({ error: "Güncellenecek alanları kontrol et." }, { status: 400 });
  const result = await updateContent(authorization.userId, await identify(context), input);
  return result.ok ? Response.json({ data: result.data }) : Response.json({ error: result.error }, { status: result.status });
}

export async function POST(_request: Request, context: Context) {
  const authorization = await authorize(); if ("error" in authorization) return authorization.error;
  const result = await duplicateContent(authorization.userId, await identify(context));
  return result.ok ? Response.json({ data: result.data }, { status: 201 }) : Response.json({ error: result.error }, { status: result.status });
}

export async function DELETE(_request: Request, context: Context) {
  const authorization = await authorize(); if ("error" in authorization) return authorization.error;
  const result = await deleteContent(authorization.userId, await identify(context));
  return result.ok ? Response.json({ data: result.data }) : Response.json({ error: result.error }, { status: result.status });
}
