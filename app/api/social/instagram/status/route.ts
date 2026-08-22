import { auth } from "@clerk/nextjs/server";
import { getSocialConnection } from "@/lib/social/connections";
import { instagramOAuthConfigured } from "@/lib/social/instagram-oauth";

export async function GET() {
  const { userId } = await auth.protect();
  const connection = await getSocialConnection(userId, "instagram");
  return Response.json({ data: { configured: instagramOAuthConfigured(), connected: Boolean(connection), accountName: connection?.accountName || null, externalAccountId: connection?.externalAccountId || null } });
}
