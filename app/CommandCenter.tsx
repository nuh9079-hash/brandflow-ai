"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useEffect, useMemo, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { UpcomingScheduledPosts } from "@/components/calendar/UpcomingScheduledPosts";

type Metrics={totalMedia?:number;totalScheduledPosts?:number;advisorReports?:number;averageAdvisorScore?:number};

function Glass({children,className=""}:{children:React.ReactNode;className?:string}){return <div className={`rounded-3xl border border-white/10 bg-[#070a16]/65 shadow-2xl shadow-black/20 backdrop-blur-2xl ${className}`}>{children}</div>}

export default function CommandCenter(){
 const {user}=useUser();
 const [metrics,setMetrics]=useState<Metrics>({});
 const [loaded,setLoaded]=useState(false);
 const name=user?.firstName||user?.fullName||"";
 const greeting=useMemo(()=>{const h=new Date().getHours();return h<12?"Günaydın":h<18?"İyi günler":"İyi akşamlar"},[]);
 useEffect(()=>{let active=true;fetch("/api/analytics/overview?range=30d&platform=all").then(r=>r.ok?r.json():null).then(j=>{if(active&&j?.data?.metrics)setMetrics(j.data.metrics)}).catch(()=>undefined).finally(()=>active&&setLoaded(true));return()=>{active=false}},[]);
 const stat=[
  ["Medya",metrics.totalMedia,"Son 30 gün"],
  ["Planlanan",metrics.totalScheduledPosts,"Takvimde"],
  ["AI Analizi",metrics.advisorReports,"Tamamlanan"],
  ["Marka Skoru",metrics.averageAdvisorScore,"Hazırlık puanı"],
 ];
 return <main className="min-h-screen text-zinc-100"><div className="flex min-h-screen flex-col lg:flex-row"><Sidebar active="Ana Sayfa"/><section className="min-w-0 flex-1 px-4 py-5 sm:px-7 lg:px-9 lg:py-7">
   <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.22em] text-violet-300/80">BrandFlow Komuta Merkezi</p><h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">{greeting}{name?`, ${name}`:""} <span className="text-violet-300">✦</span></h1><p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">Bugün önemli olan işleri tek ekranda gör. İçerik, fırsatlar, analiz ve şirket sağlığı birlikte çalışsın.</p></div><div className="flex flex-wrap gap-2"><Link href="/create" className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-violet-600/20 hover:bg-violet-500">+ İçerik Üret</Link><Link href="/calendar" className="rounded-xl border border-white/10 bg-black/25 px-4 py-2.5 text-sm font-bold text-zinc-200 backdrop-blur-xl hover:bg-white/10">Takvimi Aç</Link></div></header>
   <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{stat.map(([label,value,helper])=><Glass key={String(label)} className="p-5"><p className="text-xs font-bold uppercase tracking-[.16em] text-zinc-500">{label}</p><p className="mt-3 text-3xl font-black text-white">{loaded?(value??"—"):"…"}</p><p className="mt-1 text-xs text-zinc-500">{helper}</p></Glass>)}</div>
   <div className="mt-5 grid gap-5 2xl:grid-cols-[1.55fr_.85fr]">
    <div className="space-y-5"><Glass className="overflow-hidden p-6"><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-cyan-300">Bugünün odağı</p><h2 className="mt-2 text-2xl font-black">Markanı ileri taşıyacak sonraki hamle</h2></div><span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-300">CANLI</span></div><div className="mt-6 grid gap-3 md:grid-cols-3"><Link href="/marketing-advisor" className="rounded-2xl border border-violet-400/15 bg-violet-500/10 p-4 transition hover:-translate-y-1 hover:border-violet-300/35"><p className="text-2xl">◈</p><h3 className="mt-3 font-black">Şirket Doktoru</h3><p className="mt-1 text-sm leading-5 text-zinc-400">Eksikleri, riskleri ve büyüme alanlarını analiz et.</p></Link><Link href="/analytics" className="rounded-2xl border border-cyan-400/15 bg-cyan-500/10 p-4 transition hover:-translate-y-1 hover:border-cyan-300/35"><p className="text-2xl">↗</p><h3 className="mt-3 font-black">Analizler</h3><p className="mt-1 text-sm leading-5 text-zinc-400">Neyin çalıştığını gerçek BrandFlow verisiyle gör.</p></Link><Link href="/calendar" className="rounded-2xl border border-fuchsia-400/15 bg-fuchsia-500/10 p-4 transition hover:-translate-y-1 hover:border-fuchsia-300/35"><p className="text-2xl">✦</p><h3 className="mt-3 font-black">Planla</h3><p className="mt-1 text-sm leading-5 text-zinc-400">İçerikleri doğru güne ve saate yerleştir.</p></Link></div></Glass>
     <Glass className="p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-amber-300">Fırsat merkezi</p><h2 className="mt-2 text-xl font-black">Yaklaşan fırsatları kaçırma</h2></div><Link href="/marketing-advisor" className="text-sm font-bold text-violet-300 hover:text-violet-200">İncele →</Link></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-white/10 bg-black/20 p-4"><p className="text-xs font-black text-amber-300">İÇERİK FIRSATI</p><p className="mt-2 font-bold">Sezon ve özel gün planı</p><p className="mt-1 text-sm text-zinc-500">Markana uygun kampanyaları önceden hazırla.</p></div><div className="rounded-2xl border border-white/10 bg-black/20 p-4"><p className="text-xs font-black text-emerald-300">BÜYÜME FIRSATI</p><p className="mt-2 font-bold">En güçlü formatını büyüt</p><p className="mt-1 text-sm text-zinc-500">Analizlerde iyi çalışan içerik tipine daha fazla ağırlık ver.</p></div></div></Glass>
    </div>
    <div className="space-y-5"><Glass className="p-5"><p className="text-xs font-bold uppercase tracking-[.16em] text-violet-300">Hızlı işlemler</p><div className="mt-4 grid gap-2"><Link href="/create" className="rounded-xl border border-white/10 bg-white/[.04] px-4 py-3 text-sm font-bold hover:bg-white/10">İçerik oluştur</Link><Link href="/publish" className="rounded-xl border border-white/10 bg-white/[.04] px-4 py-3 text-sm font-bold hover:bg-white/10">Paylaşım merkezine git</Link><Link href="/profiles" className="rounded-xl border border-white/10 bg-white/[.04] px-4 py-3 text-sm font-bold hover:bg-white/10">Sosyal hesapları yönet</Link><Link href="/settings" className="rounded-xl border border-white/10 bg-white/[.04] px-4 py-3 text-sm font-bold hover:bg-white/10">Arka planı değiştir</Link></div></Glass><div className="[&>*]:!mb-0 [&>*]:!border-white/10 [&>*]:!bg-[#070a16]/65 [&>*]:!backdrop-blur-2xl"><UpcomingScheduledPosts /></div></div>
   </div>
  </section></div></main>
}
