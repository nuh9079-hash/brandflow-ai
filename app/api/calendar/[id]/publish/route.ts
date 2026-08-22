import { auth } from "@clerk/nextjs/server";
import { getScheduledPost } from "@/lib/calendar/server";
import { publishScheduledPost } from "@/lib/social/publish";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ id: string }> };
function calendarError(message: string, status = 400) { return Response.json({ error: message }, { status }); }

export async function POST(_req: Request, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) return calendarError("Paylaşım için giriş yapmalısın.", 401);
  const { id } = await context.params;
  const post = await getScheduledPost(userId, id);
  if (!post.ok) return calendarError(post.error, post.status);
  const result = await publishScheduledPost(post.data);
  const supabase = getSupabaseAdminClient();
  if (!result.ok) {
    if (supabase) await supabase.from("scheduled_posts").update({ failure_reason: result.error }).eq("id", id).eq("clerk_user_id", userId);
    return calendarError(result.error, result.status);
  }
  if (!supabase) return calendarError("Yayınlandı ancak kayıt güncellenemedi: Supabase service role eksik.", 503);
  const { data, error } = await supabase.from("scheduled_posts").update({ status: "published", published_at: result.publishedAt, external_post_id: result.externalId, failure_reason: null, processing_started_at: null, next_attempt_at: null }).eq("id", id).eq("clerk_user_id", userId).select("*, media_assets(*)").single();
  if (error || !data) return calendarError("Paylaşım yapıldı ancak takvim durumu güncellenemedi.", 500);
  const refreshed = await getScheduledPost(userId, id);
  return refreshed.ok ? Response.json({ data: refreshed.data }) : Response.json({ data: post.data });
}
