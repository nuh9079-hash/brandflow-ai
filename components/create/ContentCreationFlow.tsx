"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type MediaMode = "image" | "video" | "text" | "edit";
type Platform = "Instagram" | "Reels" | "TikTok" | "YouTube Shorts" | "Facebook" | "LinkedIn";

const modes: Array<{id:MediaMode;title:string;desc:string;icon:string}>=[
 {id:"image",title:"Görsel",desc:"Sıfırdan görsel üret veya paylaşım hazırla.",icon:"▧"},
 {id:"video",title:"Video",desc:"Reels, TikTok veya Shorts videosu hazırla.",icon:"▶"},
 {id:"text",title:"Sadece metin",desc:"Görselsiz güçlü bir paylaşım oluştur.",icon:"Aa"},
 {id:"edit",title:"Dosyamı düzenle",desc:"Kendi görselini veya videonu yükleyip geliştir.",icon:"✦"},
];
const purposes=["Ürün satmak","Takipçi artırmak","Etkileşim almak","Marka tanıtımı","Kampanya","Kişisel paylaşım"];
const platforms:Platform[]=["Instagram","Reels","TikTok","YouTube Shorts","Facebook","LinkedIn"];

export function ContentCreationFlow(){
 const[mode,setMode]=useState<MediaMode>("image");
 const[purpose,setPurpose]=useState("Ürün satmak");
 const[brief,setBrief]=useState("");
 const[platform,setPlatform]=useState<Platform>("Instagram");
 const[fileName,setFileName]=useState("");
 const recommendation=useMemo(()=>{
  const video=mode==="video"||mode==="edit";
  return {time:platform==="LinkedIn"?"Salı 09:15":"Perşembe 20:30",hook:video?"İlk 3 saniyede sonucu göster; açıklamayı sonra yap.":"İlk cümlede net faydayı söyle.",cta:purpose==="Ürün satmak"?"Detay için profildeki bağlantıya yönlendir.":"Tek bir net yorum sorusuyla etkileşim iste."};
 },[mode,platform,purpose]);
 return <div className="space-y-6">
  <section className="rounded-3xl border border-white/10 bg-[#070a16]/70 p-5 backdrop-blur-2xl sm:p-6">
   <p className="text-xs font-black uppercase tracking-[.2em] text-violet-300">1 · İçerik türü</p><h2 className="mt-2 text-2xl font-black text-white">Ne yapmak istiyorsun?</h2>
   <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{modes.map(x=><button key={x.id} onClick={()=>setMode(x.id)} className={`rounded-2xl border p-4 text-left transition ${mode===x.id?"border-violet-400/60 bg-violet-500/15 shadow-[0_0_30px_rgba(124,58,237,.12)]":"border-white/10 bg-white/[.03] hover:border-white/20"}`}><span className="text-xl text-violet-200">{x.icon}</span><p className="mt-3 font-black text-white">{x.title}</p><p className="mt-1 text-xs leading-5 text-zinc-400">{x.desc}</p></button>)}</div>
  </section>
  <section className="grid gap-6 xl:grid-cols-[1.05fr_.95fr]">
   <div className="space-y-5 rounded-3xl border border-white/10 bg-[#070a16]/70 p-5 backdrop-blur-2xl sm:p-6">
    <div><p className="text-xs font-black uppercase tracking-[.2em] text-cyan-300">2 · Amaç ve brief</p><h2 className="mt-2 text-xl font-black text-white">AI ne hazırlayacağını anlasın</h2></div>
    <div className="flex flex-wrap gap-2">{purposes.map(x=><button key={x} onClick={()=>setPurpose(x)} className={`rounded-full border px-3 py-2 text-xs font-bold ${purpose===x?"border-cyan-400/50 bg-cyan-500/15 text-cyan-100":"border-white/10 text-zinc-400"}`}>{x}</button>)}</div>
    <textarea value={brief} onChange={e=>setBrief(e.target.value)} rows={5} placeholder="Örn: Yeni kahve ürünümü gençlere tanıtmak istiyorum. Enerjik ama premium görünsün..." className="w-full resize-none rounded-2xl border border-white/10 bg-black/25 p-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-violet-400/50"/>
    <label className="block cursor-pointer rounded-2xl border border-dashed border-white/15 bg-white/[.025] p-5 text-center transition hover:border-violet-400/40"><input type="file" accept="image/*,video/*" className="hidden" onChange={e=>setFileName(e.target.files?.[0]?.name||"")}/><p className="font-bold text-white">Kendi görselini / videonu veya referans dosyanı ekle</p><p className="mt-1 text-xs text-zinc-500">İstersen boş bırakıp sıfırdan devam edebilirsin.</p>{fileName&&<p className="mt-3 text-xs font-bold text-violet-300">{fileName}</p>}</label>
    <div className="grid gap-3 sm:grid-cols-2"><Link href={mode==="video"?"/video-studio":"/image-studio"} className="rounded-2xl bg-violet-600 px-4 py-3 text-center text-sm font-black text-white transition hover:bg-violet-500">{mode==="edit"?"Dosyayı düzenlemeye başla":mode==="text"?"AI içeriği hazırla":`${mode==="video"?"Videoyu":"Görseli"} üret`}</Link><button className="rounded-2xl border border-white/10 bg-white/[.04] px-4 py-3 text-sm font-bold text-zinc-200">AI ile iyileştir</button></div>
   </div>
   <div className="rounded-3xl border border-white/10 bg-[#070a16]/70 p-5 backdrop-blur-2xl sm:p-6"><p className="text-xs font-black uppercase tracking-[.2em] text-emerald-300">3 · Yayın planı</p><h2 className="mt-2 text-xl font-black text-white">Paylaşmadan önce AI önerisi</h2><div className="mt-5 space-y-3"><Advice title="Önerilen zaman" value={recommendation.time}/><Advice title="Hook" value={recommendation.hook}/><Advice title="CTA" value={recommendation.cta}/><Advice title="İçerik amacı" value={purpose}/></div><p className="mt-4 text-[11px] leading-5 text-zinc-500">Bu alan daha sonra bağlı hesabın gerçek performans verilerine göre kişiselleştirilecek.</p></div>
  </section>
  <section className="rounded-3xl border border-white/10 bg-[#070a16]/70 p-5 backdrop-blur-2xl sm:p-6"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.2em] text-fuchsia-300">4 · Canlı önizleme</p><h2 className="mt-2 text-xl font-black text-white">Paylaşınca nasıl görünecek?</h2></div><div className="flex flex-wrap gap-2">{platforms.map(x=><button key={x} onClick={()=>setPlatform(x)} className={`rounded-full px-3 py-2 text-xs font-bold ${platform===x?"bg-white text-black":"border border-white/10 text-zinc-400"}`}>{x}</button>)}</div></div>
   <div className="mx-auto mt-6 max-w-[620px] overflow-hidden rounded-[28px] border border-white/15 bg-black shadow-2xl"><div className="flex items-center gap-3 border-b border-white/10 p-4"><div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500"/><div><p className="text-sm font-black text-white">markan</p><p className="text-[11px] text-zinc-500">{platform} · şimdi</p></div></div><div className="flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-[#15182b] via-[#090b14] to-[#25103c]"><div className="text-center"><p className="text-4xl">{mode==="video"?"▶":mode==="text"?"Aa":"✦"}</p><p className="mt-3 text-sm font-bold text-zinc-300">{fileName||brief||"Üretilen içeriğin burada gerçek platform önizlemesi görünecek."}</p></div></div><div className="p-4"><p className="text-sm text-zinc-200"><b>markan</b> {brief||"AI tarafından hazırlanan açıklama, CTA ve paylaşım metni burada görünecek."}</p><p className="mt-3 text-xs text-zinc-500">♡ Beğen &nbsp; ◯ Yorum &nbsp; ↗ Paylaş</p></div></div>
   <div className="mt-5 flex flex-wrap justify-center gap-3"><button className="rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-white">Önizlemeyi iyileştir</button><Link href="/calendar" className="rounded-xl bg-white px-5 py-3 text-sm font-black text-black">Planla / Paylaş</Link></div>
  </section>
 </div>
}
function Advice({title,value}:{title:string;value:string}){return <div className="rounded-2xl border border-white/8 bg-white/[.035] p-4"><p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">{title}</p><p className="mt-1 text-sm font-semibold leading-6 text-zinc-200">{value}</p></div>}
