"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Button, Card, EmptyState, Modal } from "@/components/ui";
import type { PublishAttempt } from "@/lib/publishing/types";

const statusLabel = { published: "Yayınlandı", failed: "Başarısız", pending: "Bekliyor" } as const;
const statusClass = { published: "bg-emerald-400/10 text-emerald-300", failed: "bg-red-400/10 text-red-300", pending: "bg-amber-400/10 text-amber-200" } as const;

export function PublishHistoryClient({ initialItems, initialError }: { initialItems: PublishAttempt[]; initialError: string }) {
  const [items, setItems] = useState(initialItems);
  const [selected, setSelected] = useState<PublishAttempt | null>(null);
  const [retryingId, setRetryingId] = useState("");
  const [message, setMessage] = useState(initialError);
  const [needsReconnect, setNeedsReconnect] = useState(false);

  async function refresh() {
    const response = await fetch("/api/publish/history", { cache: "no-store" });
    const payload = await response.json().catch(() => ({})) as { data?: PublishAttempt[]; error?: string };
    if (!response.ok || !payload.data) throw new Error(payload.error || "Paylaşım geçmişi yenilenemedi.");
    setItems(payload.data);
  }

  async function retry(item: PublishAttempt) {
    setRetryingId(item.id);
    setMessage("Paylaşım tekrar deneniyor...");
    setNeedsReconnect(false);
    try {
      const response = await fetch("/api/publish/instagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ retryAttemptId: item.id }),
      });
      const payload = await response.json().catch(() => ({})) as { data?: { mediaId: string }; error?: string; code?: string };
      await refresh();
      if (!response.ok || !payload.data) {
        setNeedsReconnect(payload.code === "connection_expired");
        throw new Error(payload.code === "connection_expired" ? "Instagram bağlantısının süresi dolmuş. Yeniden bağlanmalısın." : payload.error || "Paylaşım tekrar tamamlanamadı.");
      }
      setMessage("Paylaşım başarıyla tamamlandı. Eski başarısız deneme geçmişte korunuyor.");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Paylaşım tekrar tamamlanamadı.");
    } finally {
      setRetryingId("");
    }
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-black text-white">Paylaşım Geçmişi</h2>
        <p className="mt-1 text-sm text-zinc-500">Gerçek platform yayın denemeleri ve sonuçları.</p>
      </div>
      {message ? <div className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-300"><span>{message}</span>{needsReconnect ? <Link href="/connections" className="shrink-0 font-bold text-amber-300">Yeniden Bağla</Link> : null}</div> : null}
      {!items.length && !initialError ? <EmptyState title="Henüz paylaşım yok" description="Paylaşım Merkezi'nden yaptığın gerçek yayın denemeleri burada görünecek." /> : null}
      <div className="grid gap-3">
        {items.map((item) => (
          <Card key={item.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
            <button type="button" onClick={() => setSelected(item)} className="relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-md bg-zinc-950 text-xs font-bold text-zinc-500">
              {item.media?.signedUrl && item.media.type !== "video" ? <Image src={item.media.signedUrl} alt={item.media.name} fill unoptimized className="object-cover" /> : item.media?.type === "video" ? "VIDEO" : "MEDYA"}
            </button>
            <button type="button" onClick={() => setSelected(item)} className="min-w-0 flex-1 text-left">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-white/10 px-2 py-1 text-[11px] font-bold text-zinc-200">Instagram</span>
                <span className={`rounded px-2 py-1 text-[11px] font-bold ${statusClass[item.status]}`}>{statusLabel[item.status]}</span>
              </div>
              <p className="mt-2 truncate text-sm font-semibold text-white">{item.caption.split(/\r?\n/)[0] || "Açıklama yok"}</p>
              <p className="mt-1 text-xs text-zinc-500">{item.accountUsername ? `@${item.accountUsername.replace(/^@/, "")}` : item.accountName || "Hesap bilgisi yok"} · {new Date(item.createdAt).toLocaleString("tr-TR")}</p>
              {item.providerMediaId ? <p className="mt-1 truncate text-[11px] text-zinc-600">Media ID: {item.providerMediaId}</p> : null}
            </button>
            {item.status === "failed" ? <Button type="button" variant="secondary" disabled={retryingId === item.id} onClick={() => void retry(item)}>{retryingId === item.id ? "Deneniyor..." : "Tekrar Dene"}</Button> : null}
          </Card>
        ))}
      </div>

      <Modal title="Paylaşım Detayı" open={Boolean(selected)} onClose={() => setSelected(null)}>
        {selected ? <div className="space-y-4">
          <div className="relative aspect-video overflow-hidden rounded-md bg-black">
            {selected.media?.signedUrl && selected.media.type !== "video" ? <Image src={selected.media.signedUrl} alt={selected.media.name} fill unoptimized className="object-contain" /> : selected.media?.signedUrl ? <video src={selected.media.signedUrl} controls className="h-full w-full object-contain" /> : <div className="grid h-full place-items-center text-sm text-zinc-500">Medya önizlemesi bulunamadı.</div>}
          </div>
          <div><p className="text-xs font-bold uppercase text-zinc-500">Tam caption</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-200">{selected.caption}</p></div>
          <div className="grid gap-3 sm:grid-cols-2"><div><p className="text-xs text-zinc-500">Hesap</p><p className="text-sm text-white">{selected.accountUsername ? `@${selected.accountUsername.replace(/^@/, "")}` : selected.accountName || "Bilinmiyor"}</p></div><div><p className="text-xs text-zinc-500">Durum</p><p className="text-sm text-white">{statusLabel[selected.status]}</p></div></div>
          {selected.errorMessage ? <div className="rounded-md border border-red-400/20 bg-red-400/10 p-4"><p className="text-xs font-bold uppercase text-red-300">Hata detayı</p><p className="mt-2 text-sm text-red-100">{selected.errorMessage}</p>{selected.errorCode ? <p className="mt-2 text-xs text-red-300">Kod: {selected.errorCode}</p> : null}</div> : null}
        </div> : null}
      </Modal>
    </section>
  );
}
