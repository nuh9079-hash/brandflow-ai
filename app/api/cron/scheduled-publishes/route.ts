import { timingSafeEqual } from "node:crypto";
import { listDueScheduledPublishIds } from "@/lib/scheduling/server";
import { processScheduledPublish } from "@/lib/scheduling/processor";

export const runtime = "nodejs";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET || "";
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || request.headers.get("x-cron-secret") || "";
  if (!secret || !supplied) return false;
  const expected = Buffer.from(secret); const actual = Buffer.from(supplied);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function POST(request: Request) {
  if (!process.env.CRON_SECRET) return Response.json({ error: "CRON_SECRET yapılandırılmadı." }, { status: 503 });
  if (!authorized(request)) return Response.json({ error: "Yetkisiz cron isteği." }, { status: 401 });
  const ids = await listDueScheduledPublishIds();
  const results = [];
  for (const id of ids) results.push(await processScheduledPublish(id));
  return Response.json({ data: { checked: ids.length, published: results.filter((item) => item.ok).length, failed: results.filter((item) => !item.ok).length } });
}
