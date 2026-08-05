import type { UsageItem } from "@/lib/billing/types";

export function UsageProgress({ item }: { item: UsageItem }) {
  const percent = item.limit === null ? 0 : Math.min(100, Math.round((item.used / Math.max(item.limit, 1)) * 100));
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-bold text-zinc-200">{item.label}</span>
        <span className="text-zinc-400">{item.limit === null ? `${item.used} kullanıldı · Sınırsız` : `${item.used} / ${item.limit}`}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/5">
        <div className={`h-full rounded-full ${percent >= 90 ? "bg-amber-400" : "bg-emerald-400"}`} style={{ width: item.limit === null ? "100%" : `${percent}%`, opacity: item.limit === null ? 0.35 : 1 }} />
      </div>
      <p className="mt-1 text-xs text-zinc-500">{item.remaining === null ? "Aylık sınır yok" : `${item.remaining} kullanım kaldı`}</p>
    </div>
  );
}
