import { auth } from "@clerk/nextjs/server";
import { duplicateUserProfile, listUserProfiles } from "@/lib/profiles/server";
import { getUserBillingPlan } from "@/lib/billing/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_req: Request, context: RouteContext) {
  const { userId } = await auth();

  if (!userId) {
    return Response.json({ error: "Profil için giriş yapmanız gerekiyor." }, { status: 401 });
  }

  const [{ profiles }, billing] = await Promise.all([listUserProfiles(userId), getUserBillingPlan(userId)]);
  if (billing.plan.profileLimit !== null && profiles.length >= billing.plan.profileLimit) {
    return Response.json({ error: `Bu plan en fazla ${billing.plan.profileLimit} profil destekliyor.` }, { status: 403 });
  }

  const { id } = await context.params;
  const { storage, profile } = await duplicateUserProfile(userId, id);
  return Response.json({ storage, profile });
}
