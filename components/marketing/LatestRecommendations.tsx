"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui";
import type { MarketingAdvisorReport } from "@/lib/marketing/advisor";

type AdvisorResponse = {
  data?: MarketingAdvisorReport[];
  error?: string;
};

function scoreClass(score: number) {
  if (score >= 80) return "text-emerald-200";
  if (score >= 60) return "text-amber-200";
  return "text-red-200";
}

export function LatestRecommendations() {
  const [reports, setReports] = useState<MarketingAdvisorReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadReports() {
      try {
        const response = await fetch("/api/marketing-advisor/analyze?limit=3");
        const json = (await response.json()) as AdvisorResponse;

        if (active && response.ok && Array.isArray(json.data)) {
          setReports(json.data);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadReports();

    return () => {
      active = false;
    };
  }, []);

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Advisor</p>
          <h2 className="mt-2 text-lg font-black text-white">Latest AI Recommendations</h2>
        </div>
        <Link href="/marketing-advisor" className="rounded-lg border border-white/10 px-3 py-2 text-xs font-black text-zinc-300 transition hover:bg-white/5 hover:text-white">
          Aç
        </Link>
      </div>

      <div className="mt-4 grid gap-2">
        {loading ? (
          <>
            <div className="h-12 animate-pulse rounded-lg bg-white/5" />
            <div className="h-12 animate-pulse rounded-lg bg-white/5" />
          </>
        ) : reports.length === 0 ? (
          <p className="text-sm text-zinc-500">Henüz AI önerisi yok.</p>
        ) : (
          reports.map((report) => (
            <div key={report.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
              <div>
                <p className="text-sm font-black text-white">{report.platform} analizi</p>
                <p className="mt-1 line-clamp-1 text-xs text-zinc-500">{report.analysis.suggestedCampaignObjective}</p>
              </div>
              <span className={`text-lg font-black ${scoreClass(report.analysis.overallScore)}`}>{report.analysis.overallScore}</span>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
