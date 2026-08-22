"use client";

import { useEffect, useState } from "react";

type Status = { configured: boolean; connected: boolean; accountName: string | null; externalAccountId: string | null };

export function InstagramConnectionCard() {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  async function load() { const r = await fetch("/api/social/instagram/status", { cache: "no-store" }); const j = await r.json(); if (r.ok) setStatus(j.data); }
  useEffect(() => { void load(); }, []);
  async function disconnect() { setBusy(true); await fetch("/api/social/instagram/disconnect", { method: "POST" }); await load(); setBusy(false); }
  return <div className="mb-5 rounded-3xl border border-violet-400/20 bg-violet-500/[.06] p-5 backdrop-blur-xl"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-black uppercase tracking-[.18em] text-violet-300">Otomatik yayın</p><h2 className="mt-2 text-xl font-black text-white">Instagram bağlantısı</h2><p className="mt-1 text-sm text-zinc-400">{!status?"Kontrol ediliyor...":status.connected?`${status.accountName || "Instagram"} bağlı. Takvimde planladığın içerikler zamanı gelince otomatik yayınlanabilir.`:status.configured?"Hesabını bir kez bağla; sonra planlanan içerikleri BrandFlow kendisi yayınlasın.":"Instagram OAuth ayarları eksik. .env.local ve Vercel ortam değişkenlerini tamamla."}</p></div>{status?.connected?<button disabled={busy} onClick={disconnect} className="rounded-xl border border-red-400/30 px-4 py-2.5 text-sm font-black text-red-200">{busy?"Kaldırılıyor...":"Bağlantıyı kaldır"}</button>:<button disabled={!status?.configured} onClick={()=>{window.location.href="/api/social/instagram/connect"}} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40">Instagram hesabını bağla</button>}</div></div>;
}
