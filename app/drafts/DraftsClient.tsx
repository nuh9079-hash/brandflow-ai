"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Button, Card, EmptyState } from "@/components/ui";
import type { PublishDraft } from "@/lib/drafts/types";

const platformLabels: Record<string, string> = {
  instagram: "IG", tiktok: "TT", facebook: "FB", twitter: "X", linkedIn: "in", youtubeShorts: "YT",
};

function updatedLabel(value: string) {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function DraftsClient({ initialDrafts, initialError }: { initialDrafts: PublishDraft[]; initialError: string }) {
  const [drafts, setDrafts] = useState(initialDrafts);
  const [error, setError] = useState(initialError);
  const [deletingId, setDeletingId] = useState("");

  async function removeDraft(draft: PublishDraft) {
    if (!window.confirm(`“${draft.name}” taslağını silmek istediğine emin misin?`)) return;
    setDeletingId(draft.id);
    try {
      const response = await fetch(`/api/drafts/${encodeURIComponent(draft.id)}`, { method: "DELETE" });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Taslak silinemedi.");
      setDrafts((current) => current.filter((item) => item.id !== draft.id));
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Taslak silinemedi.");
    } finally {
      setDeletingId("");
    }
  }

  return (
    <div className="space-y-5">
      {error ? <div className="rounded-md border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</div> : null}
      {!drafts.length && !error ? <EmptyState title="Henüz taslak yok" description="Paylaşım Merkezi'nde hazırladığın bir içeriği Taslak Kaydet butonuyla burada saklayabilirsin." /> : null}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {drafts.map((draft) => (
          <Card key={draft.id} className="flex min-w-0 gap-4 p-4">
            <div className="relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-md bg-zinc-950 text-xs font-bold text-zinc-500">
              {draft.media?.signedUrl && draft.media.type !== "video" ? <Image src={draft.media.signedUrl} alt={draft.media.name} fill unoptimized className="object-cover" /> : draft.media?.type === "video" ? "VIDEO" : "MEDYA YOK"}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-bold text-white">{draft.name}</h2>
              <p className="mt-1 line-clamp-1 text-xs text-zinc-400">{draft.caption || "Metin eklenmemiş"}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {draft.selectedPlatforms.map((platform) => <span key={platform} className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-zinc-300">{platformLabels[platform] || platform}</span>)}
              </div>
              <p className="mt-2 text-[11px] text-zinc-500">{updatedLabel(draft.updatedAt)}</p>
              <div className="mt-3 flex gap-2">
                <Link href={`/publish?draft=${encodeURIComponent(draft.id)}`} className="inline-flex items-center rounded-md bg-emerald-400 px-3 py-1.5 text-xs font-bold text-zinc-950">Devam Et</Link>
                <Button type="button" variant="ghost" className="px-3 py-1.5 text-xs" disabled={deletingId === draft.id} onClick={() => void removeDraft(draft)}>{deletingId === draft.id ? "Siliniyor" : "Sil"}</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
