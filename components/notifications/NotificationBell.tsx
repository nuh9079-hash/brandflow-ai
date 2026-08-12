"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { AppNotification } from "@/lib/notifications/types";
import { NotificationDrawer } from "@/components/notifications/NotificationDrawer";

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadNotifications = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      const payload = await response.json().catch(() => ({})) as { data?: { items?: AppNotification[] }; error?: string };
      if (!response.ok) throw new Error(payload.error || "Bildirimler yüklenemedi.");
      setItems(payload.data?.items ?? []);
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Bildirimler yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadNotifications(), 0);
    const interval = window.setInterval(() => void loadNotifications(), 30_000);
    const refresh = () => void loadNotifications();
    window.addEventListener("focus", refresh);
    window.addEventListener("brandflow:notifications-changed", refresh);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("brandflow:notifications-changed", refresh);
    };
  }, [loadNotifications]);

  const unreadCount = items.filter((item) => !item.readAt).length;

  async function markRead(id?: string) {
    const response = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(id ? { id } : {}),
    });
    if (!response.ok) return;
    const readAt = new Date().toISOString();
    setItems((current) => current.map((item) => (!id || item.id === id) ? { ...item, readAt: item.readAt || readAt } : item));
  }

  async function openItem(item: AppNotification) {
    if (!item.readAt) await markRead(item.id);
    setOpen(false);
    router.push(item.href);
  }

  return (
    <>
      <button type="button" aria-label="Bildirimler" aria-expanded={open} onClick={() => { setOpen(true); void loadNotifications(); }} className="relative grid h-10 w-10 place-items-center rounded-md border border-white/10 text-lg text-zinc-300 hover:border-white/25 hover:bg-white/5 hover:text-white">
        <span aria-hidden="true">🔔</span>
        {unreadCount > 0 ? <span className="absolute -right-1.5 -top-1.5 min-w-5 rounded-full bg-emerald-400 px-1.5 text-center text-[11px] font-bold leading-5 text-zinc-950">{unreadCount > 99 ? "99+" : unreadCount}</span> : null}
      </button>
      <NotificationDrawer open={open} items={items} loading={loading} error={error} unreadCount={unreadCount} onClose={() => setOpen(false)} onOpenItem={openItem} onMarkAllRead={() => void markRead()} />
    </>
  );
}
