import { auth } from "@clerk/nextjs/server";
import { getMedia } from "@/lib/media/server";
import { createSignedMediaUrl } from "@/lib/media/storage";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function mediaError(status: number, message = "Medya işlemi tamamlanamadı.") {
  return Response.json({ error: message }, { status });
}

export async function POST(_req: Request, context: RouteContext) {
  const { userId } = await auth();

  if (!userId) return mediaError(401, "Medya önizlemesi için giriş yapmalısın.");

  const { id } = await context.params;
  const media = await getMedia(userId, id);

  if (!media.ok) return mediaError(media.status, media.error);
  if (!media.data.storagePath) return mediaError(404, "Bu medyanın dosya bağlantısı bulunamadı.");

  const signedUrl = await createSignedMediaUrl(userId, media.data.storagePath);

  if (!signedUrl.ok) return mediaError(signedUrl.status, signedUrl.error);

  return Response.json({
    data: {
      media: media.data,
      signedUrl: signedUrl.data.signedUrl,
    },
  });
}
