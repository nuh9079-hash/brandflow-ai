"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type MediaMode = "image" | "video" | "text" | "edit";
type Platform = "Instagram" | "Reels" | "TikTok" | "YouTube Shorts" | "Facebook" | "LinkedIn";
type ImproveStyle = "professional" | "sales" | "natural" | "short" | "viral";
type AiResult = {
  caption: string;
  hook: string;
  cta: string;
  hashtags: string[];
  bestTime: string;
  timingReason: string;
  visualDirection: string;
  videoScript: string[];
  contentScore: number;
  scoreReason: string;
};

const modes: Array<{id:MediaMode;title:string;desc:string;icon:string}> = [
  {id:"image",title:"Görsel",desc:"Sıfırdan görsel üret veya paylaşım hazırla.",icon:"▧"},
  {id:"video",title:"Video",desc:"Reels, TikTok veya Shorts videosu hazırla.",icon:"▶"},
  {id:"text",title:"Sadece metin",desc:"Görselsiz güçlü bir paylaşım oluştur.",icon:"Aa"},
  {id:"edit",title:"Dosyamı düzenle",desc:"Kendi görselini veya videonu yükleyip geliştir.",icon:"✦"},
];
const purposes=["Ürün satmak","Takipçi artırmak","Etkileşim almak","Marka tanıtımı","Kampanya","Kişisel paylaşım"];
const platforms:Platform[]=["Instagram","Reels","TikTok","YouTube Shorts","Facebook","LinkedIn"];
const improveStyles:Array<{id:ImproveStyle;label:string}>=[
  {id:"professional",label:"Daha profesyonel"},{id:"sales",label:"Satış odaklı"},{id:"natural",label:"Daha doğal"},{id:"short",label:"Daha kısa"},{id:"viral",label:"Daha dikkat çekici"},
];

export function ContentCreationFlow(){
  const[mode,setMode]=useState<MediaMode>("image");
  const[purpose,setPurpose]=useState("Ürün satmak");
  const[brief,setBrief]=useState("");
  const[platform,setPlatform]=useState<Platform>("Instagram");
  const[fileName,setFileName]=useState("");
  const[fileType,setFileType]=useState<"image"|"video"|null>(null);
  const[fileUrl,setFileUrl]=useState("");
  const[improveStyle,setImproveStyle]=useState<ImproveStyle>("professional");
  const[ai,setAi]=useState<AiResult|null>(null);
  const[loading,setLoading]=useState(false);
  const[error,setError]=useState("");

  useEffect(()=>()=>{if(fileUrl)URL.revokeObjectURL(fileUrl)},[fileUrl]);

  const previewCaption=useMemo(()=>ai?.caption || "AI paylaşım metnini hazırladığında burada gerçek önizlemesini göreceksin.",[ai]);

  function handleFile(file?:File){
    if(!file)return;
    if(fileUrl)URL.revokeObjectURL(fileUrl);
    setFileName(file.name);
    setFileType(file.type.startsWith("video/")?"video":"image");
    setFileUrl(URL.createObjectURL(file));
    setAi(null);
  }

  async function generateAi(style=improveStyle){
    if(!brief.trim()){
      setError("Önce ne istediğini kısaca yaz.");
      return;
    }
    setLoading(true);setError("");setImproveStyle(style);
    try{
      const r=await fetch("/api/create-assistant",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({mode,purpose,brief,platform,improveStyle:style,fileName,fileType}),
      });
      const j=await r.json() as {data?:AiResult;error?:string};
      if(!r.ok||!j.data)throw new Error(j.error||"AI önerisi oluşturulamadı.");
      setAi(j.data);
    }catch(e){setError(e instanceof Error?e.message:"AI önerisi oluşturulamadı.")}
    finally{setLoading(false)}
  }

  const isVideo=mode==="video"||fileType==="video";

  return <div className="space-y-6">
    <section className="rounded-3xl border border-white/10 bg-[#070a16]/70 p-5 backdrop-blur-2xl sm:p-6">
      <p className="text-xs font-black uppercase tracking-[.2em] text-violet-300">1 · İçerik türü</p>
      <h2 className="mt-2 text-2xl font-black text-white">Ne yapmak istiyorsun?</h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {modes.map(x=><button key={x.id} onClick={()=>{setMode(x.id);setAi(null)}} className={`rounded-2xl border p-4 text-left transition ${mode===x.id?"border-violet-400/60 bg-violet-500/15":"border-white/10 bg-white/[.03] hover:border-white/20"}`}><span className="text-xl text-violet-200">{x.icon}</span><p className="mt-3 font-black text-white">{x.title}</p><p className="mt-1 text-xs leading-5 text-zinc-400">{x.desc}</p></button>)}
      </div>
    </section>

    <section className="grid gap-6 xl:grid-cols-[1.05fr_.95fr]">
      <div className="space-y-5 rounded-3xl border border-white/10 bg-[#070a16]/70 p-5 backdrop-blur-2xl sm:p-6">
        <div><p className="text-xs font-black uppercase tracking-[.2em] text-cyan-300">2 · Amaç ve brief</p><h2 className="mt-2 text-xl font-black text-white">AI ne hazırlayacağını anlasın</h2></div>
        <div className="flex flex-wrap gap-2">{purposes.map(x=><button key={x} onClick={()=>{setPurpose(x);setAi(null)}} className={`rounded-full border px-3 py-2 text-xs font-bold ${purpose===x?"border-cyan-400/50 bg-cyan-500/15 text-cyan-100":"border-white/10 text-zinc-400"}`}>{x}</button>)}</div>
        <textarea value={brief} onChange={e=>{setBrief(e.target.value);setAi(null)}} rows={5} placeholder="Örn: Yeni kahve ürünümü gençlere tanıtmak istiyorum. Enerjik, premium ama samimi olsun." className="w-full resize-none rounded-2xl border border-white/10 bg-black/25 p-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-violet-400/50"/>

        <label className="block cursor-pointer overflow-hidden rounded-2xl border border-dashed border-white/15 bg-white/[.025] transition hover:border-violet-400/40">
          <input type="file" accept="image/*,video/*" className="hidden" onChange={e=>handleFile(e.target.files?.[0])}/>
          {fileUrl?<div className="space-y-3 p-3">{fileType==="video"?<video src={fileUrl} controls className="max-h-[300px] w-full rounded-xl bg-black object-contain"/>:<img src={fileUrl} alt="Yüklenen referans" className="max-h-[300px] w-full rounded-xl bg-black object-contain"/>}<div className="flex items-center justify-between gap-3 px-1 pb-1"><div className="min-w-0"><p className="truncate text-sm font-bold text-white">{fileName}</p><p className="text-xs text-zinc-500">Referans dosyan hazır.</p></div><span className="rounded-lg border border-violet-400/20 bg-violet-500/10 px-3 py-2 text-xs font-bold text-violet-200">Değiştir</span></div></div>:<div className="p-5 text-center"><p className="font-bold text-white">Kendi görselini / videonu veya referansını ekle</p><p className="mt-1 text-xs text-zinc-500">Yüklediğin dosya burada gerçek önizleme olarak görünür.</p></div>}
        </label>

        <div className="rounded-2xl border border-violet-400/15 bg-violet-500/[.055] p-4">
          <p className="text-sm font-black text-white">AI ile iyileştir</p><p className="mt-1 text-xs text-zinc-400">Ton seç; AI brief’i aynen kopyalamadan yeni paylaşım metni oluşturur.</p>
          <div className="mt-3 flex flex-wrap gap-2">{improveStyles.map(x=><button type="button" key={x.id} onClick={()=>void generateAi(x.id)} disabled={loading} className={`rounded-full border px-3 py-2 text-xs font-bold transition ${improveStyle===x.id&&ai?"border-violet-400/50 bg-violet-500/20 text-white":"border-white/10 bg-black/15 text-zinc-400 hover:text-white"}`}>{x.label}</button>)}</div>
        </div>

        {error&&<div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm font-semibold text-red-200">{error}</div>}
        <button type="button" onClick={()=>void generateAi()} disabled={loading} className="w-full rounded-2xl bg-violet-600 px-4 py-3 text-sm font-black text-white transition hover:bg-violet-500 disabled:opacity-50">{loading?"AI hazırlıyor...":"AI içerik paketini hazırla"}</button>
        <div className="grid gap-3 sm:grid-cols-2"><Link href={mode==="video"?"/video-studio":"/image-studio"} className="rounded-2xl border border-white/10 bg-white/[.04] px-4 py-3 text-center text-sm font-black text-white">{mode==="edit"?"Dosyayı düzenle":mode==="text"?"Metin araçlarına geç":`${mode==="video"?"Video":"Görsel"} stüdyosuna geç`}</Link><Link href="/media" className="rounded-2xl border border-white/10 bg-white/[.04] px-4 py-3 text-center text-sm font-black text-white">Medya merkezinden seç</Link></div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-[#070a16]/70 p-5 backdrop-blur-2xl sm:p-6">
        <p className="text-xs font-black uppercase tracking-[.2em] text-emerald-300">3 · AI yayın planı</p><h2 className="mt-2 text-xl font-black text-white">Paylaşmadan önce öneri</h2>
        <div className="mt-5 space-y-3"><Advice title="Önerilen zaman" value={ai?.bestTime||"AI üretiminden sonra hesaplanacak."}/><Advice title="Neden bu zaman?" value={ai?.timingReason||"Bağlı hesap performansı varsa sonraki aşamada kişiselleştirilecek."}/><Advice title="Hook" value={ai?.hook||"AI üretiminden sonra görünecek."}/><Advice title="CTA" value={ai?.cta||"AI üretiminden sonra görünecek."}/><Advice title="Görsel / video yönü" value={ai?.visualDirection||"AI üretiminden sonra görünecek."}/></div>
        {ai&&<div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/[.06] p-4"><div className="flex items-center justify-between"><span className="text-sm font-bold text-emerald-100">Yayın öncesi skor</span><span className="text-2xl font-black text-white">{ai.contentScore}/100</span></div><p className="mt-2 text-xs leading-5 text-zinc-400">{ai.scoreReason}</p></div>}
        {ai&&isVideo&&ai.videoScript.length>0&&<div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4"><p className="text-xs font-black uppercase tracking-wider text-zinc-500">Video akışı</p><div className="mt-2 space-y-2">{ai.videoScript.map((x,i)=><p key={i} className="text-sm text-zinc-300">{i+1}. {x}</p>)}</div></div>}
      </div>
    </section>

    <section className="rounded-3xl border border-white/10 bg-[#070a16]/70 p-5 backdrop-blur-2xl sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.2em] text-fuchsia-300">4 · Canlı önizleme</p><h2 className="mt-2 text-xl font-black text-white">Paylaşınca nasıl görünecek?</h2></div><div className="flex flex-wrap gap-2">{platforms.map(x=><button key={x} onClick={()=>{setPlatform(x);setAi(null)}} className={`rounded-full px-3 py-2 text-xs font-bold ${platform===x?"bg-white text-black":"border border-white/10 text-zinc-400"}`}>{x}</button>)}</div></div>
      <div className="mx-auto mt-6 max-w-[620px] overflow-hidden rounded-[28px] border border-white/15 bg-black shadow-2xl"><div className="flex items-center gap-3 border-b border-white/10 p-4"><div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500"/><div><p className="text-sm font-black text-white">markan</p><p className="text-[11px] text-zinc-500">{platform} · önizleme</p></div></div>
        {mode==="text"?<div className="flex min-h-[260px] items-center justify-center bg-gradient-to-br from-[#15182b] via-[#090b14] to-[#25103c] p-10 text-center"><p className="max-w-md text-2xl font-black leading-tight text-white">{previewCaption}</p></div>:fileUrl?<div className="flex max-h-[560px] min-h-[300px] items-center justify-center bg-black">{fileType==="video"?<video src={fileUrl} controls className="max-h-[560px] w-full object-contain"/>:<img src={fileUrl} alt="Platform önizlemesi" className="max-h-[560px] w-full object-contain"/>}</div>:<div className="flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-[#15182b] via-[#090b14] to-[#25103c]"><div className="px-8 text-center"><p className="text-4xl">{mode==="video"?"▶":"✦"}</p><p className="mt-3 text-sm font-bold text-zinc-300">Üretilen {mode==="video"?"video":"görsel"} burada görünecek.</p></div></div>}
        <div className="p-4"><p className="text-sm leading-6 text-zinc-200"><b>markan</b> {previewCaption}</p>{ai&&ai.hashtags.length>0&&<p className="mt-2 text-xs leading-5 text-violet-300">{ai.hashtags.join(" ")}</p>}<p className="mt-3 text-xs text-zinc-500">♡ Beğen &nbsp; ◯ Yorum &nbsp; ↗ Paylaş</p></div>
      </div>
      <div className="mt-5 flex flex-wrap justify-center gap-3"><button type="button" onClick={()=>void generateAi()} disabled={loading} className="rounded-xl border border-violet-400/30 bg-violet-500/10 px-4 py-3 text-sm font-bold text-violet-100">{loading?"İyileştiriliyor...":"Önizlemeyi AI ile iyileştir"}</button><Link href="/calendar" className="rounded-xl bg-white px-5 py-3 text-sm font-black text-black">Planla / Paylaş</Link></div>
    </section>
  </div>
}

function Advice({title,value}:{title:string;value:string}){return <div className="rounded-2xl border border-white/8 bg-white/[.035] p-4"><p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">{title}</p><p className="mt-1 text-sm font-semibold leading-6 text-zinc-200">{value}</p></div>}
