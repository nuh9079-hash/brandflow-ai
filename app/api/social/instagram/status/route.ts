import { auth } from "@clerk/nextjs/server";
import { getSocialConnection } from "@/lib/social/connections";
import { instagramOAuthConfigured } from "@/lib/social/instagram-oauth";

export async function GET() {
  const { userId } = await auth.protect();
  const [instagram, facebook] = await Promise.all([
    getSocialConnection(userId, "instagram"),
    getSocialConnection(userId, "facebook"),
  ]);
  return Response.json({
    data: {
      configured: instagramOAuthConfigured(),
      connected: Boolean(instagram),
      instagramConnected: Boolean(instagram),
      facebookConnected: Boolean(facebook),
      accountName: instagram?.accountName || facebook?.accountName || null,
      externalAccountId: instagram?.externalAccountId || null,
    },
  });
}
