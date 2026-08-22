import { auth } from "@clerk/nextjs/server";
import { getSocialConnection } from "@/lib/social/connections";
import { instagramOAuthConfigured } from "@/lib/social/instagram-oauth";

export async function GET() {
  const { userId } = await auth.protect();
  const instagram = await getSocialConnection(userId, "instagram");
  return Response.json({
    data: {
      configured: instagramOAuthConfigured(),
      connected: Boolean(instagram),
      instagramConnected: Boolean(instagram),
      accountName: instagram?.accountName || null,
      accountUsername: instagram?.accountUsername || null,
      externalAccountId: instagram?.externalAccountId || null,
      tokenExpiresAt: instagram?.tokenExpiresAt || null,
    },
  });
}
