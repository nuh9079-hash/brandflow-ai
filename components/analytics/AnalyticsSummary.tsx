"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui";
import type { AnalyticsOverview } from "@/lib/analytics/server";

export function AnalyticsSummary() {
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  useEffect(() => {
    let active = true;
    fetch("/api/analytics")
      .then((response) => response.ok ? response.json() : null)
      .then((json: { data?: AnalyticsOverview } | null) => { if (active && json?.data) setData(json.data); })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  return (
    <Card className="mb-5 p-5">
      <div className="flex items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Analytics</p><h2 className="mt-2 text-lg font-black">Son 30 gün özeti</h2></div><Link href="/analytics" className="rounded-lg border border-white/10 px-3 py-2 text-xs font-black text-zinc-300 hover:bg-white/5">Detaylar</Link></div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[{ label: "Görseller", value: data?.metrics.totalImages }, { label: "Videolar", value: data?.metrics.totalVideos }, { label: "Planlanan", value: data?.metrics.scheduledPosts }, { label: "Bağlantılar", value: data?.metrics.connectedAccounts }].map((item) => <div key={item.label} className="rounded-lg border border-white/10 bg-white/[0.03] p-3"><p className="text-xs text-zinc-500">{item.label}</p><p className="mt-1 text-xl font-black">{item.value ?? "-"}</p></div>)}
      </div>
    </Card>
  );
}
