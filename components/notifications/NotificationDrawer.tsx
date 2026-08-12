import type { AppNotification } from "@/lib/notifications/types";
import { NotificationItem } from "@/components/notifications/NotificationItem";

type NotificationDrawerProps = {
  open: boolean;
  items: AppNotification[];
  loading: boolean;
  error: string;
  unreadCount: number;
  onClose: () => void;
  onOpenItem: (item: AppNotification) => void;
  onMarkAllRead: () => void;
};

export function NotificationDrawer(props: NotificationDrawerProps) {
  return (
    <>
      <button type="button" aria-label="Bildirimleri kapat" onClick={props.onClose} className={`fixed inset-0 z-50 bg-black/55 transition-opacity ${props.open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`} />
      <aside aria-hidden={!props.open} className={`fixed inset-y-0 right-0 z-[60] flex w-full max-w-md flex-col border-l border-white/10 bg-[#111113] shadow-2xl transition-transform duration-200 ${props.open ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
          <div>
            <h2 className="font-semibold text-white">Bildirimler</h2>
            <p className="text-xs text-zinc-500">{props.unreadCount ? `${props.unreadCount} okunmamış` : "Tümü okundu"}</p>
          </div>
          <button type="button" onClick={props.onClose} aria-label="Bildirimleri kapat" className="grid h-9 w-9 place-items-center rounded-md text-2xl text-zinc-400 hover:bg-white/5 hover:text-white">×</button>
        </div>
        <div className="flex items-center justify-end border-b border-white/10 px-5 py-3">
          <button type="button" onClick={props.onMarkAllRead} disabled={!props.unreadCount} className="text-xs font-semibold text-emerald-300 disabled:text-zinc-600">Tümünü okundu yap</button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {props.loading ? <div className="space-y-3 p-5">{[0, 1, 2].map((item) => <div key={item} className="h-24 animate-pulse rounded-md bg-white/5" />)}</div> : null}
          {!props.loading && props.error ? <div className="m-5 rounded-md border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">{props.error}</div> : null}
          {!props.loading && !props.error && !props.items.length ? <div className="grid min-h-64 place-items-center px-6 text-center"><div><p className="font-semibold text-white">Henüz bildirim yok</p><p className="mt-2 text-sm text-zinc-500">Önemli işlemler burada görünecek.</p></div></div> : null}
          {!props.loading && !props.error ? props.items.map((item) => <NotificationItem key={item.id} item={item} onOpen={props.onOpenItem} />) : null}
        </div>
      </aside>
    </>
  );
}
