import { auth } from "@clerk/nextjs/server";
import { setDefaultUserProfile } from "@/lib/profiles/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_req: Request, context: RouteContext) {
  const { userId } = await auth();

  if (!userId) {
    return Response.json({ error: "Profil için giriş yapmanız gerekiyor." }, { status: 401 });
  }

  const { id } = await context.params;
  const { storage, profile } = await setDefaultUserProfile(userId, id);
  return Response.json({ storage, profile });
}
