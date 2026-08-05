import { auth } from "@clerk/nextjs/server";
import { testInstagramEnvironmentToken } from "@/lib/social/instagram";

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Instagram bağlantısını test etmek için giriş yapmalısın." }, { status: 401 });
  }

  const result = await testInstagramEnvironmentToken();
  return result.ok
    ? Response.json({ data: result.data })
    : Response.json({ error: result.error, code: result.code }, { status: result.status });
}
