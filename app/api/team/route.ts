import { auth, currentUser } from "@clerk/nextjs/server";
import { getTeamWorkspace } from "@/lib/team/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Takım alanını görmek için giriş yapmalısın." }, { status: 401 });
  const user = await currentUser();
  const result = await getTeamWorkspace(userId, {
    name: user?.fullName || user?.firstName || "BrandFlow kullanıcısı",
    email: user?.primaryEmailAddress?.emailAddress || "",
  });
  return result.ok ? Response.json({ data: result.data }) : Response.json({ error: result.error }, { status: result.status });
}
