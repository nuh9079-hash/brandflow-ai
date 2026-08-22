import { getScheduledPost } from "@/lib/calendar/server";
import { publishScheduledPost } from "@/lib/social/publish";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

const MAX_ATTEMPTS = 3;
const BATCH_SIZE = 12;

export type AutoPublishSummary = { checked: number; claimed: number; published: number; failed: number; retrying: number; skipped: number };

function nextRetry(attempt: number) {
  const minutes = Math.min(60, 5 * 2 ** Math.max(0, attempt - 1));
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

export async function processDueScheduledPosts(): Promise<AutoPublishSummary> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) throw new Error("Otomatik yayın için SUPABASE_SERVICE_ROLE_KEY gerekli.");
  const now = new Date().toISOString();
  const stale = new Date(Date.now() - 10 * 60_000).toISOString();
  const summary: AutoPublishSummary = { checked: 0, claimed: 0, published: 0, failed: 0, retrying: 0, skipped: 0 };

  const { data, error } = await supabase
    .from("scheduled_posts")
    .select("id,clerk_user_id,attempt_count")
    .eq("status", "scheduled")
    .not("scheduled_at", "is", null)
    .lte("scheduled_at", now)
    .or(`next_attempt_at.is.null,next_attempt_at.lte.${now}`)
    .order("scheduled_at", { ascending: true })
    .limit(BATCH_SIZE);
  if (error) throw new Error("Planlanan gönderiler okunamadı. Yeni otomatik yayın migration'ını Supabase'de çalıştır.");

  summary.checked = data?.length || 0;
  for (const row of data || []) {
    const attempt = Number(row.attempt_count || 0) + 1;
    const { data: claimed, error: claimError } = await supabase
      .from("scheduled_posts")
      .update({ processing_started_at: now, last_attempt_at: now, attempt_count: attempt })
      .eq("id", row.id)
      .eq("status", "scheduled")
      .or(`processing_started_at.is.null,processing_started_at.lt.${stale}`)
      .select("id")
      .maybeSingle();
    if (claimError || !claimed) { summary.skipped += 1; continue; }
    summary.claimed += 1;

    const post = await getScheduledPost(String(row.clerk_user_id), String(row.id));
    if (!post.ok) {
      await supabase.from("scheduled_posts").update({ processing_started_at: null, failure_reason: post.error, status: attempt >= MAX_ATTEMPTS ? "failed" : "scheduled", next_attempt_at: attempt >= MAX_ATTEMPTS ? null : nextRetry(attempt) }).eq("id", row.id);
      if (attempt >= MAX_ATTEMPTS) summary.failed += 1;
      else summary.retrying += 1;
      continue;
    }

    const result = await publishScheduledPost(post.data);
    if (result.ok) {
      await supabase.from("scheduled_posts").update({ status: "published", published_at: result.publishedAt, external_post_id: result.externalId, processing_started_at: null, next_attempt_at: null, failure_reason: null }).eq("id", row.id);
      summary.published += 1;
    } else {
      const finalFailure = attempt >= MAX_ATTEMPTS;
      await supabase.from("scheduled_posts").update({ status: finalFailure ? "failed" : "scheduled", processing_started_at: null, next_attempt_at: finalFailure ? null : nextRetry(attempt), failure_reason: result.error }).eq("id", row.id);
      if (finalFailure) summary.failed += 1;
      else summary.retrying += 1;
    }
  }
  return summary;
}
