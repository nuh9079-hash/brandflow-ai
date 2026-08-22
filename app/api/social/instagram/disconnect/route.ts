import { auth } from "@clerk/nextjs/server";
import { deleteSocialConnection } from "@/lib/social/connections";

export async function POST() {
  const { userId } = await auth.protect();
  const ok = await deleteSocialConnection(userId, "instagram");
  return ok ? Response.json({ ok: true }) : Response.json({ error: "Instagram bağlantısı kaldırılamadı." }, { status: 500 });
}
