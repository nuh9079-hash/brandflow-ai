import { auth } from "@clerk/nextjs/server";
import { deleteScheduledPost, sanitizeScheduledPostUpdate, updateScheduledPost } from "@/lib/calendar/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function calendarError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export async function PATCH(req: Request, context: RouteContext) {
  const { userId } = await auth();

  if (!userId) {
    return calendarError("Planı düzenlemek için giriş yapmalısın.", 401);
  }

  const { id } = await context.params;
  const input = sanitizeScheduledPostUpdate(await req.json());

  if (!input) {
    return calendarError("Plan bilgilerini kontrol et.", 400);
  }

  const result = await updateScheduledPost(userId, id, input);

  if (!result.ok) {
    return calendarError(result.error, result.status);
  }

  return Response.json({ data: result.data });
}

export async function DELETE(_req: Request, context: RouteContext) {
  const { userId } = await auth();

  if (!userId) {
    return calendarError("Planı silmek için giriş yapmalısın.", 401);
  }

  const { id } = await context.params;
  const result = await deleteScheduledPost(userId, id);

  if (!result.ok) {
    return calendarError(result.error, result.status);
  }

  return Response.json({ data: result.data });
}
