import { auth } from "@clerk/nextjs/server";
import { createMedia, deleteMedia, updateMediaStorage } from "@/lib/media/server";
import { createSignedUpload, createUploadPath } from "@/lib/media/storage";
import { validateUploadRequest } from "@/lib/media/validation";

function mediaError(status: number) {
  return Response.json({ error: "Medya işlemi tamamlanamadı." }, { status });
}

export async function POST(req: Request) {
  const { userId } = await auth();

  if (!userId) return mediaError(401);

  const body = await req.json();
  const validation = validateUploadRequest(body);

  if (!validation.ok) return mediaError(400);

  const created = await createMedia(userId, validation.data.media);

  if (!created.ok) return mediaError(created.status);

  const storagePath = createUploadPath(userId, created.data.id, validation.data.filename);
  const stored = await updateMediaStorage(userId, created.data.id, storagePath);

  if (!stored.ok) {
    await deleteMedia(userId, created.data.id);
    return mediaError(stored.status);
  }

  const upload = await createSignedUpload(userId, storagePath);

  if (!upload.ok) {
    await deleteMedia(userId, created.data.id);
    return mediaError(upload.status);
  }

  return Response.json({
    data: {
      media: stored.data,
      storagePath,
      upload: upload.data,
    },
  });
}
