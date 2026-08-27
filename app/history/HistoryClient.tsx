"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useMemo, useState } from "react";
import { EmptyState, Modal, SearchInput, Button, Card } from "@/components/ui";
import {
  mergeGeneratedContents,
  readCachedGeneratedContents,
  removeCachedGeneratedContent,
  setCachedGeneratedContentFavorite,
} from "@/lib/client-content-cache";
import type { GeneratedContentRecord } from "@/lib/content-store";

type HistoryClientProps = {
  initialItems: GeneratedContentRecord[];
  emptyTitle: string;
  emptyDescription: string;
};

export function HistoryClient({ initialItems, emptyTitle, emptyDescription }: HistoryClientProps) {
  const [items, setItems] = useState(initialItems);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<GeneratedContentRecord | null>(null);
  const { user } = useUser();

  useEffect(() => {
    if (!user?.id) return;
    const timer = window.setTimeout(() => {
      setItems((current) => mergeGeneratedContents(current, readCachedGeneratedContents(user.id)));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [user?.id]);

  const filteredItems = useMemo(() => {
    const value = query.toLocaleLowerCase("tr-TR");
    return items.filter((item) => {
      const matchesQuery = [item.product, item.tone, item.content].some((field) =>
        field.toLocaleLowerCase("tr-TR").includes(value)
      );
      const matchesFilter = filter === "all" || (filter === "favorite" && item.is_favorite);
      return matchesQuery && matchesFilter;
    });
  }, [filter, items, query]);

  async function copyContent(content: string) {
    await navigator.clipboard.writeText(content);
  }

  async function deleteItem(id: string) {
    setItems((current) => current.filter((item) => item.id !== id));
    removeCachedGeneratedContent(user?.id, id);
    await fetch("/api/history", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  }

  async function toggleFavorite(item: GeneratedContentRecord) {
    const nextFavorite = !item.is_favorite;
    setItems((current) => current.map((entry) => (entry.id === item.id ? { ...entry, is_favorite: nextFavorite } : entry)));
    setCachedGeneratedContentFavorite(user?.id, item.id, nextFavorite);
    await fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentId: item.id, favorite: nextFavorite }),
    });
  }

  if (items.length === 0) return <EmptyState title={emptyTitle} description={emptyDescription} />;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-[1fr_180px]">
        <SearchInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="İçerikte ara..." />
        <select value={filter} onChange={(event) => setFilter(event.target.value)} className="rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none">
          <option value="all">Hepsi</option>
          <option value="favorite">Favoriler</option>
        </select>
      </div>

      {filteredItems.length === 0 ? (
        <EmptyState title="Sonuç bulunamadı" description="Arama veya filtreyi değiştirerek tekrar dene." />
      ) : (
        <div className="grid gap-4">
          {filteredItems.map((item) => (
            <Card key={item.id} className="p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">{new Date(item.created_at).toLocaleDateString("tr-TR")}</p>
                  <h3 className="mt-2 text-lg font-bold text-white">{item.product}</h3>
                  <p className="mt-1 text-sm text-zinc-400">Ton: {item.tone}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" onClick={() => setSelected(item)}>Tekrar aç</Button>
                  <Button type="button" variant="secondary" onClick={() => copyContent(item.content)}>Kopyala</Button>
                  <Button type="button" variant="secondary" onClick={() => toggleFavorite(item)}>{item.is_favorite ? "Favoriden çıkar" : "Favoriye ekle"}</Button>
                  <Button type="button" variant="secondary" onClick={() => deleteItem(item.id)}>Sil</Button>
                </div>
              </div>
              <p className="mt-4 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-zinc-400">{item.content}</p>
            </Card>
          ))}
        </div>
      )}

      <Modal title={selected?.product ?? "Üretilen içerik"} open={Boolean(selected)} onClose={() => setSelected(null)}>
        <pre className="whitespace-pre-wrap rounded-lg bg-zinc-950 p-4 text-sm leading-6 text-zinc-200">{selected?.content}</pre>
      </Modal>
    </div>
  );
}
