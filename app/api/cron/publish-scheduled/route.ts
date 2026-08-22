import { processDueScheduledPosts } from "@/lib/calendar/auto-publisher";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (process.env.NODE_ENV === "production" && !secret) return Response.json({ error: "CRON_SECRET yapılandırılmadı." }, { status: 503 });
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ error: "Yetkisiz cron isteği." }, { status: 401 });
  try {
    const summary = await processDueScheduledPosts();
    return Response.json({ ok: true, data: summary, ranAt: new Date().toISOString() });
  } catch (error) {
    console.error("auto-publish cron", error);
    return Response.json({ error: error instanceof Error ? error.message : "Otomatik yayın çalıştırılamadı." }, { status: 500 });
  }
}
