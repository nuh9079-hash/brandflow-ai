import { auth } from "@clerk/nextjs/server";
import { deleteSocialConnection } from "@/lib/social/connections";

export async function POST() {
  const { userId } = await auth?.protect();
  const [instagramOk, facebookOk] = await Promise.all([
    deleteSocialConnection(userId, "instagram"),
    deleteSocialConnection(userId, "facebook"),
  ]);
  return instagramOk && facebookOk
    ? Response.json({ ok: true })
    : Response.json({ error: "Meta hesap bağlantısı tamamen kaldırılamadı. Tekrar deneyebilirsin." }, { status: 500 });
}
