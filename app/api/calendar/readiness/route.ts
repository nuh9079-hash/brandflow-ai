import { auth } from "@clerk/nextjs/server";
import { automaticPublishPlatforms, type CalendarPlatform } from "@/lib/calendar/types";
import { getSocialConnection } from "@/lib/social/connections";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

function isPlatform(value: string | null): value is CalendarPlatform {
  return value === "instagram" || value === "facebook" || value === "twitter" || value === "tiktok" || value === "linkedin";
}

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Otomatik yayın durumunu görmek için giriş yapmalısın." }, { status: 401 });

  const requested = new URL(request.url).searchParams.get("platform");
  const platform: CalendarPlatform = isPlatform(requested) ? requested : "instagram";
  const supported = automaticPublishPlatforms.includes(platform);
  const connection = supported ? await getSocialConnection(userId, platform) : null;

  let schedulerActive = false;
  let schedulerEnabled = false;
  const supabase = getSupabaseAdminClient();
  if (supabase) {
    const { data } = await supabase.rpc("brandflow_autopublish_scheduler_status");
    const row = Array.isArray(data) ? data[0] : data;
    if (row && typeof row === "object") {
      const status = row as { enabled?: boolean; active?: boolean };
      schedulerEnabled = status.enabled === true;
      schedulerActive = status.active === true;
    }
  }

  return Response.json({
    data: {
      platform,
      supported,
      connected: Boolean(connection),
      accountName: connection?.accountName || null,
      schedulerEnabled,
      schedulerActive,
      backgroundReady: supported && Boolean(connection) && schedulerEnabled && schedulerActive,
      message: !supported
        ? "Bu platform için otomatik yayın henüz etkin değil; takvimi manuel hatırlatma olarak kullanabilirsin."
        : !connection
          ? "Otomatik yayın için önce Sosyal Hesaplar bölümünden hesabını bağla."
          : !schedulerActive
            ? "Hesabın hazır. Sunucu zamanlayıcısı etkinleştiğinde planlar site kapalıyken de otomatik yayınlanacak."
            : "Hazır: planlanan içerikler site kapalıyken de otomatik yayınlanabilir.",
    },
  });
}
