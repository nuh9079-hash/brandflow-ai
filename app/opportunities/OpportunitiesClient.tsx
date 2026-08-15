"use client";

import Link from "next/link";
import { useEffect,useMemo,useState } from "react";

type Report={id:string;platform:string;createdAt?:string;analysis:{overallScore:number;recommendations?:string[];suggestedCampaignObjective?:string;contentIdeas?:string[]}};

type Opportunity={title:string;detail:string;platform:string;score:number;kind:"Kampanya"|"İçerik"|"Büyüme"};

export default function OpportunitiesClient(){
 const [reports,setReports]=useState<Report[]>([]);const[loading,setLoading]=useState(true);
 useEffect(()=>{let active=true;fetch("/api/marketing-advisor/analyze?limit=12").then(r=>r.ok?r.json():null).then(j=>{if(active&&Array.isArray(j?.data))setReports(j.data)}).catch(()=>undefined).finally(()=>active&&setLoading(false));return()=>{active=false}},[]);
 const opportunities=useMemo(()=>{
  const items:Opportunity[]=[];for(const r of reports){if(r.analysis.suggestedCampaignObjective)items.push({title:r.analysis.suggestedCampaignObjective,detail:`${r.platform} için kampanya yönü`,platform:r.platform,score:r.analysis.overallScore,kind:"Kampanya"});for(const x of (r.analysis.contentIdeas||[]).slice(0,2))items.push({title:x,detail:`${r.platform} içerik fikri`,platform:r.platform,score:r.analysis.overallScore,kind:"İçerik"});for(const x of (r.analysis.recommendations||[]).slice(0,2))items.push({title:x,detail:`${r.platform} büyüme aksiyonu`,platform:r.platform,score:r.analysis.overallScore,kind:"Büyüme"})}
  const seen=new Set<string>();return items.filter(i=>{const k=i.title.toLocaleLowerCase("tr-TR").trim();if(seen.has(k))return false;seen.add(k);return true}).slice(0,12)
 },[reports]);
 if(loading)return <div className="grid gap-4 md:grid-cols-2">{[1,2,3,4].map(i=><div key={i} className="h-36 animate-pulse rounded-3xl border border-white/10 bg-white/[.04]"/>)}</div>;
 if(!opportunities.length)return <div className="rounded-3xl border border-white/10 bg-[#070a16]/65 p-8 backdrop-blur-2xl"><h2 className="text-xl font-black">Henüz fırsat oluşturacak veri yok</h2><p className="mt-2 text-sm text-zinc-400">Markan için AI analizi oluşturduğunda kampanya ve büyüme önerileri burada otomatik toplanır.</p><Link href="/marketing-advisor" className="mt-5 inline-block rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-black text-white">Analiz oluştur</Link></div>;
 return <div className="grid gap-4 md:grid-cols-2">{opportunities.map((o,i)=><div key={`${o.title}-${i}`} className="rounded-3xl border border-white/10 bg-[#070a16]/70 p-5 backdrop-blur-2xl"><div className="flex items-center justify-between gap-3"><span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${o.kind==="Kampanya"?"bg-amber-400/10 text-amber-300":o.kind==="İçerik"?"bg-cyan-400/10 text-cyan-300":"bg-emerald-400/10 text-emerald-300"}`}>{o.kind}</span><span className="text-xs font-bold text-zinc-500">Skor {o.score}</span></div><h3 className="mt-4 font-black text-white">{o.title}</h3><p className="mt-2 text-sm text-zinc-500">{o.detail}</p><div className="mt-4 flex gap-2"><Link href="/create" className="rounded-lg bg-violet-600/90 px-3 py-2 text-xs font-black text-white">İçeriğe dönüştür</Link><Link href="/calendar" className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-zinc-300">Planla</Link></div></div>)}</div>
}
