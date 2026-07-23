import { auth } from "@clerk/nextjs/server";
import { deleteMedia, getMedia, updateMedia } from "@/lib/media/server";
import { deleteStoredFile } from "@/lib/media/storage";
import { validateUpdateMediaInput } from "@/lib/media/validation";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function mediaError(status: number) {
  return Response.json({ error: "Medya işlemi tamamlanamadı." }, { status });
}

export async function GET(_req: Request, context: RouteContext) {
  const { userId } = await auth();

  if (!userId) return mediaError(401);

  const { id } = await context.params;
  const result = await getMedia(userId, id);

  if (!result.ok) return mediaError(result.status);

  return Response.json({ data: result.data });
}

export async function PATCH(req: Request, context: RouteContext) {
  const { userId } = await auth();

  if (!userId) return mediaError(401);

  const body = await req.json();
  const validation = validateUpdateMediaInput(body);

  if (!validation.ok) return mediaError(400);

  const { id } = await context.params;
  const result = await updateMedia(userId, id, validation.data);

  if (!result.ok) return mediaError(result.status);

  return Response.json({ data: result.data });
}

export async function DELETE(_req: Request, context: RouteContext) {
  const { userId } = await auth();

  if (!userId) return mediaError(401);

  const { id } = await context.params;
  const media = await getMedia(userId, id);

  if (!media.ok) return mediaError(media.status);

  if (media.data.storagePath) {
    await deleteStoredFile(userId, media.data.storagePath);
  }

  const result = await deleteMedia(userId, id);

  if (!result.ok) return mediaError(result.status);

  return Response.json({ data: result.data });
}
