"use client";

import { useEffect, useState } from "react";

type Status = {
  configured: boolean;
  connected: boolean;
  instagramConnected: boolean;
  accountName: string | null;
  accountUsername: string | null;
  externalAccountId: string | null;
  tokenExpiresAt: string | null;
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

  function connect() {
    window.location.href = "/api/social/instagram/connect";
  }

  return <div className="mb-5 rounded-3xl border border-violet-400/20 bg-violet-500/[.06] p-5 backdrop-blur-xl">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-black uppercase tracking-[.18em] text-violet-300">Otomatik yayın</p>
        <h2 className="mt-2 text-xl font-black text-white">Instagram hesabı</h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-400">
          {!status
            ? "Kontrol ediliyor..."
            : status.connected
              ? `${status.accountUsername ? `@${status.accountUsername}` : status.accountName || "Instagram hesabın"} bağlı. Takvimde planladığın içerikler zamanı gelince BrandFlow tarafından otomatik yayınlanabilir.`
              : status.configured
                ? "Instagram hesabını normal giriş ekranından bağla. Bir kez izin verdikten sonra BrandFlow planlanan içerikleri sen uygulamayı açmadan yayınlayabilir."
                : "Instagram bağlantı ayarları eksik. Geliştirici ayarları tamamlanmadan hesap bağlanamaz."}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-bold">
          <span className={`rounded-full border px-3 py-1 ${status?.connected ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" : "border-white/10 bg-black/20 text-zinc-500"}`}>
            {status?.connected ? "Bağlı ✓" : "Bağlı değil"}
          </span>
          {status?.connected && <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-zinc-300">Otomatik paylaşım hazır</span>}
        </div>
        {error && <p className="mt-3 text-sm font-semibold text-red-200">{error}</p>}
      </div>

      <div className="flex shrink-0 flex-wrap gap-2">
        {status?.connected && <button disabled={busy || !status.configured} onClick={connect} className="rounded-xl border border-violet-400/30 bg-violet-500/10 px-4 py-2.5 text-sm font-black text-violet-100 disabled:opacity-40">Başka Instagram hesabı bağla</button>}
        {!status?.connected && <button disabled={!status?.configured || busy} onClick={connect} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40">Instagram hesabını bağla</button>}
        {status?.connected && <button disabled={busy} onClick={disconnect} className="rounded-xl border border-red-400/30 px-4 py-2.5 text-sm font-black text-red-200 disabled:opacity-50">{busy ? "Kaldırılıyor..." : "Bağlantıyı kaldır"}</button>}
      </div>
    </div>
  </div>;
}
