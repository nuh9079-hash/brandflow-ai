"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui";
import type { ContentCalendarItem } from "@/lib/calendar/content-types";

type CalendarResponse = {
  data?: ContentCalendarItem[];
  error?: string;
};

function dateLabel(value: string | null | undefined) {
  if (!value) return "Saat seçilmedi";
  return new Date(value).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function UpcomingScheduledPosts() {
  const [posts, setPosts] = useState<ContentCalendarItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadPosts() {
      try {
        const params = new URLSearchParams({
          from: new Date().toISOString(),
          status: "scheduled",
          limit: "5",
        });
        const response = await fetch(`/api/calendar?${params.toString()}`);
        const json = (await response.json()) as CalendarResponse;

        if (active && response.ok && json.data) {
          setPosts(json.data);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadPosts();

    return () => {
      active = false;
    };
  }, []);

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Calendar</p>
          <h2 className="mt-2 text-lg font-black text-white">Yaklaşan paylaşımlar</h2>
        </div>
        <Link href="/calendar" className="rounded-lg border border-white/10 px-3 py-2 text-xs font-black text-zinc-300 transition hover:bg-white/5 hover:text-white">
          Aç
        </Link>
      </div>

      <div className="mt-4 grid gap-2">
        {loading ? (
          <>
            <div className="h-12 animate-pulse rounded-lg bg-white/5" />
            <div className="h-12 animate-pulse rounded-lg bg-white/5" />
          </>
        ) : posts.length === 0 ? (
          <p className="text-sm text-zinc-500">Henüz planlanmış paylaşım yok.</p>
        ) : (
          posts.map((post) => (
            <div key={post.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm font-black text-white">{post.title}</p>
                <span className="text-xs font-bold text-emerald-200">{post.platforms.join(", ")}</span>
              </div>
              <p className="mt-1 text-xs text-zinc-500">{dateLabel(post.scheduledAt)}</p>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
