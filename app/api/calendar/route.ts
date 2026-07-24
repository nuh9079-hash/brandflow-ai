import { auth } from "@clerk/nextjs/server";
import { createScheduledPost, listScheduledPosts, parseCalendarFilters, sanitizeScheduledPostInput } from "@/lib/calendar/server";

function calendarError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export async function GET(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return calendarError("Takvim için giriş yapmalısın.", 401);
  }

  const result = await listScheduledPosts(userId, parseCalendarFilters(new URL(req.url).searchParams));

  if (!result.ok) {
    return calendarError(result.error, result.status);
  }

  return Response.json({ data: result.data });
}

export async function POST(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return calendarError("Plan oluşturmak için giriş yapmalısın.", 401);
  }

  const input = sanitizeScheduledPostInput(await req.json());

  if (!input) {
    return calendarError("Plan bilgilerini kontrol et.", 400);
  }

  const result = await createScheduledPost(userId, input);

  if (!result.ok) {
    return calendarError(result.error, result.status);
  }

  return Response.json({ data: result.data });
}
