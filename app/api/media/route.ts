import { auth } from "@clerk/nextjs/server";
import { createMedia, listMedia } from "@/lib/media/server";
import { validateCreateMediaInput, validateMediaFilters } from "@/lib/media/validation";

function mediaError(status: number) {
  return Response.json({ error: "Medya işlemi tamamlanamadı." }, { status });
}

export async function GET(req: Request) {
  const { userId } = await auth();

  if (!userId) return mediaError(401);

  const filters = validateMediaFilters(new URL(req.url).searchParams);
  const result = await listMedia(userId, filters);

  if (!result.ok) return mediaError(result.status);

  return Response.json({ data: result.data });
}

export async function POST(req: Request) {
  const { userId } = await auth();

  if (!userId) return mediaError(401);

  const body = await req.json();
  const validation = validateCreateMediaInput(body);

  if (!validation.ok) return mediaError(400);

  const result = await createMedia(userId, validation.data);

  if (!result.ok) return mediaError(result.status);

  return Response.json({ data: result.data });
}
