import { auth } from "@clerk/nextjs/server";
import { inviteTeamMember, updateInvitation } from "@/lib/team/server";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Davet göndermek için giriş yapmalısın." }, { status: 401 });
  const body = await request.json() as { workspaceId?: string; email?: string; role?: string; action?: "resend" | "cancel"; invitationId?: string };
  if (body.action) {
    if (!body.invitationId || !["resend", "cancel"].includes(body.action)) return Response.json({ error: "Geçerli bir davet işlemi seç." }, { status: 400 });
    const result = await updateInvitation(userId, body.invitationId, body.action);
    return result.ok ? Response.json({ data: result.data }) : Response.json({ error: result.error }, { status: result.status });
  }
  if (!body.workspaceId) return Response.json({ error: "Çalışma alanı kimliği gerekli." }, { status: 400 });
  const result = await inviteTeamMember(userId, body.workspaceId, body.email, body.role);
  return result.ok ? Response.json({ data: result.data }, { status: 201 }) : Response.json({ error: result.error }, { status: result.status });
}
