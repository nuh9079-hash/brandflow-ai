import type { AppNotification } from "@/lib/notifications/types";

function relativeTime(value: string) {
  const elapsed = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(elapsed) || elapsed < 0) return "Şimdi";
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return "Şimdi";
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} sa önce`;
  const days = Math.floor(hours / 24);
  return `${days} gün önce`;
}

export function NotificationItem({ item, onOpen }: { item: AppNotification; onOpen: (item: AppNotification) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className={`w-full border-b border-white/10 px-5 py-4 text-left transition hover:bg-white/5 ${item.readAt ? "bg-transparent" : "bg-emerald-400/[0.06]"}`}
    >
      <span className="flex items-start gap-3">
        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.readAt ? "bg-zinc-700" : "bg-emerald-400"}`} />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-white">{item.title}</span>
          <span className="mt-1 block text-sm leading-5 text-zinc-400">{item.description}</span>
          <span className="mt-2 block text-xs text-zinc-500">{relativeTime(item.createdAt)}</span>
        </span>
      </span>
    </button>
  );
}
