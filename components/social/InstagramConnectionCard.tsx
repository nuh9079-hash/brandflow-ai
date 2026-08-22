"use client";

import { useEffect, useState } from "react";

type Status = {
  configured: boolean;
  connected: boolean;
  instagramConnected: boolean;
  facebookConnected: boolean;
  accountName: string | null;
  externalAccountId: string | null;
};

export function InstagramConnectionCard() {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    try {
      const r = await fetch("/api/social/instagram/status", { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "Bağlantı durumu alınamadı.");
      setStatus(j.data);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bağlantı durumu alınamadı.");
    }
  }

  useEffect(() => { void load(); }, []);

  async function disconnect() {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/social/instagram/disconnect", { method: "POST" });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "Bağlantı kaldırılamadı.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bağlantı kaldırılamadı.");
    } finally {
      setBusy(false);
    }
  }

  const ready = Boolean(status?.instagramConnected && status?.facebookConnected);

  return <div className="mb-5 rounded-3xl border border-violet-400/20 bg-violet-500/[.06] p-5 backdrop-blur-xl">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-black uppercase tracking-[.18em] text-violet-300">Otomatik yayın</p>
        <h2 className="mt-2 text-xl font-black text-white">Meta hesap bağlantısı</h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-400">
          {!status
            ? "Kontrol ediliyor..."
            : ready
              ? `${status.accountName || "Meta hesabın"} hazır. Instagram ve Facebook için planladığın içerikler zamanı gelince BrandFlow tarafından otomatik yayınlanabilir.`
              : status.instagramConnected
                ? "Instagram bağlı. Facebook otomatik paylaşımı için hesabı bir kez yeniden bağlayıp yeni yayın iznini onayla."
                : status.configured
                  ? "Hesabını bir kez bağla; sonra Instagram ve Facebook planlarını BrandFlow sen uygulamayı açmadan yayınlasın."
                  : "Meta OAuth ayarları eksik. .env.local ve yayın ortamındaki değişkenleri tamamlaman gerekiyor."}
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
          <span className={`rounded-full border px-3 py-1 ${status?.instagramConnected ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" : "border-white/10 bg-black/20 text-zinc-500"}`}>Instagram {status?.instagramConnected ? "✓" : "—"}</span>
          <span className={`rounded-full border px-3 py-1 ${status?.facebookConnected ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" : "border-white/10 bg-black/20 text-zinc-500"}`}>Facebook {status?.facebookConnected ? "✓" : "—"}</span>
        </div>
        {error && <p className="mt-3 text-sm font-semibold text-red-200">{error}</p>}
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        {status?.connected && <button disabled={busy} onClick={disconnect} className="rounded-xl border border-red-400/30 px-4 py-2.5 text-sm font-black text-red-200 disabled:opacity-50">{busy ? "Kaldırılıyor..." : "Bağlantıyı kaldır"}</button>}
        {!ready && <button disabled={!status?.configured || busy} onClick={() => { window.location.href = "/api/social/instagram/connect"; }} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40">{status?.instagramConnected ? "Yeniden bağla" : "Meta hesabını bağla"}</button>}
      </div>
    </div>
  </div>;
}
