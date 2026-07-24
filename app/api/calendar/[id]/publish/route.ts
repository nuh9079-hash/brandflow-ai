import { auth } from "@clerk/nextjs/server";
import { getPublisher } from "@/lib/calendar/providers/registry";
import { getScheduledPost, updateScheduledPost } from "@/lib/calendar/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function calendarError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export async function POST(_req: Request, context: RouteContext) {
  const { userId } = await auth();

  if (!userId) {
    return calendarError("Paylaşım için giriş yapmalısın.", 401);
  }

  const { id } = await context.params;
  const post = await getScheduledPost(userId, id);

  if (!post.ok) {
    return calendarError(post.error, post.status);
  }

  const publisher = getPublisher(post.data.platform);

  if (!publisher.configured) {
    const failed = await updateScheduledPost(userId, id, {
      status: "failed",
    });

    return calendarError(
      failed.ok
        ? "Bu platform için gerçek paylaşım sağlayıcısı yapılandırılmadı."
        : "Paylaşım sağlayıcısı yapılandırılmadı ve durum güncellenemedi.",
      503,
    );
  }

  const published = await publisher.publish(post.data);

  if (!published.ok) {
    await updateScheduledPost(userId, id, { status: "failed" });
    return calendarError(published.error, published.status);
  }

  const updated = await updateScheduledPost(userId, id, {
    status: "published",
  });

  if (!updated.ok) {
    return calendarError(updated.error, updated.status);
  }

  return Response.json({ data: updated.data });
}
