"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui";
import type { BillingOverview } from "@/lib/billing/types";

export function BillingSummary() {
  const [data, setData] = useState<BillingOverview | null>(null);
  useEffect(() => {
    let active = true;
    fetch("/api/billing/overview").then((response) => response.ok ? response.json() : null).then((json: { data?: BillingOverview } | null) => { if (active && json?.data) setData(json.data); }).catch(() => undefined);
    return () => { active = false; };
  }, []);
  const images = data?.usage.find((item) => item.metric === "ai_images");
  const videos = data?.usage.find((item) => item.metric === "ai_videos");
  return (
    <Card className="mb-5 p-5">
      <div className="flex items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Plan ve kullanım</p><h2 className="mt-2 text-lg font-black">{data ? `${data.plan.name} planı` : "Billing yükleniyor"}</h2></div><Link href="/billing" className="rounded-lg bg-emerald-400 px-3 py-2 text-xs font-black text-zinc-950 hover:bg-emerald-300">{data?.plan.id === "free" ? "Yükselt" : "Yönet"}</Link></div>
      <div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-lg border border-white/10 bg-white/[0.03] p-3"><p className="text-xs text-zinc-500">AI görsel kalan</p><p className="mt-1 text-xl font-black">{images?.remaining ?? (images ? "Sınırsız" : "-")}</p></div><div className="rounded-lg border border-white/10 bg-white/[0.03] p-3"><p className="text-xs text-zinc-500">AI video kalan</p><p className="mt-1 text-xl font-black">{videos?.remaining ?? (videos ? "Sınırsız" : "-")}</p></div></div>
    </Card>
  );
}
