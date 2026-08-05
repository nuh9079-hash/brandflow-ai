import { auth } from "@clerk/nextjs/server";
import { removeTeamMember, updateTeamMember } from "@/lib/team/server";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Üye düzenlemek için giriş yapmalısın." }, { status: 401 });
  const { id } = await context.params;
  const body = await request.json() as { role?: string; status?: string };
  const result = await updateTeamMember(userId, id, body);
  return result.ok ? Response.json({ data: result.data }) : Response.json({ error: result.error }, { status: result.status });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Üye kaldırmak için giriş yapmalısın." }, { status: 401 });
  const { id } = await context.params;
  const result = await removeTeamMember(userId, id);
  return result.ok ? Response.json({ data: result.data }) : Response.json({ error: result.error }, { status: result.status });
}
