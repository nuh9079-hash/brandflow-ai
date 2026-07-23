import { auth } from "@clerk/nextjs/server";
import { getProfile, updateProfile } from "@/lib/content-store";

export async function GET() {
  const { userId } = await auth.protect();
  const profile = await getProfile(userId);

  return Response.json({ profile });
}

export async function PUT(req: Request) {
  const { userId } = await auth.protect();
  const body = await req.json();
  const result = await updateProfile(userId, body);

  return Response.json(result, { status: result.ok ? 200 : 500 });
}
