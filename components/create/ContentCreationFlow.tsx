"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type MediaMode = "image" | "video" | "text" | "edit";
type Platform = "Instagram" | "Reels" | "TikTok" | "YouTube Shorts" | "Facebook" | "LinkedIn";
type ImproveStyle = "professional" | "sales" | "natural" | "short" | "viral";

const modes: Array<{id:MediaMode;title:string;desc:string;icon:string}>=[
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
 const[improved,setImproved]=useState(false);

 useEffect(()=>()=>{if(fileUrl)URL.revokeObjectURL(fileUrl)},[fileUrl]);

 const recommendation=useMemo(()=>{
  const video=mode==="video"||fileType==="video";
  return {time:platform==="LinkedIn"?"Salı 09:15":"Perşembe 20:30",hook:video?"İlk 3 saniyede sonucu göster; açıklamayı sonra yap.":"İlk cümlede net faydayı söyle.",cta:purpose==="Ürün satmak"?"Detay için profildeki bağlantıya yönlendir.":"Tek bir net yorum sorusuyla etkileşim iste."};
 },[mode,platform,purpose,fileType]);

 const previewCaption=useMemo(()=>{
  if(!brief.trim()) return "AI tarafından hazırlanan açıklama, CTA ve paylaşım metni burada görünecek.";
  const subject=brief.trim().replace(/[.!?]+$/g,"");
  const base=purpose==="Ürün satmak"
   ? `${subject}. Tasarımın detaylarını keşfet ve sana en uygun seçeneği görmek için profil bağlantısına göz at.`
   : purpose==="Takipçi artırmak"
   ? `${subject}. Bu tarz içeriklerin devamı için hesabı takip etmeyi unutma.`
   : purpose==="Etkileşim almak"
   ? `${subject}. Sen olsan hangi detayı seçerdin? Yorumlarda yaz.`
   : `${subject}. Markanın hikâyesini güçlü, net ve akılda kalıcı bir şekilde anlat.`;
  if(!improved)return base;
  if(improveStyle==="sales")return `Yeni favorin olmaya aday: ${subject}. Detayları incele, sana uygun seçeneği keşfet ve harekete geç.`;
  if(improveStyle==="natural")return `${subject}. Biz bu fikri çok sevdik. Senin yorumunu da gerçekten merak ediyoruz.`;
  if(improveStyle==="short")return `${subject}. Detaylar profilde.`;
  if(improveStyle==="viral")return `Bunu görmeden geçme: ${subject}. En güçlü detayı sence hangisi?`;
  return `${subject}. Güçlü tasarım, net mesaj ve doğru sunumla markanı daha görünür hale getir.`;
 },[brief,purpose,improved,improveStyle]);

 function handleFile(file?:File){
  if(!file)return;
  if(fileUrl)URL.revokeObjectURL(fileUrl);
  setFileName(file.name);
  setFileType(file.type.startsWith("video/")?"video":"image");
  setFileUrl(URL.createObjectURL(file));
 }

 return <div className="space-y-6">
  <section className="rounded-3xl border border-white/10 bg-[#070a16]/70 p-5 backdrop-blur-2xl sm:p-6">
   <p className="text-xs font-black uppercase tracking-[.2em] text-violet-300">1 · İçerik türü</p><h2 className="mt-2 text-2xl font-black text-white">Ne yapmak istiyorsun?</h2>
   <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{modes.map(x=><button key={x.id} onClick={()=>setMode(x.id)} className={`rounded-2xl border p-4 text-left transition ${mode===x.id?"border-violet-400/60 bg-violet-500/15 shadow-[0_0_30px_rgba(124,58,237,.12)]":"border-white/10 bg-white/[.03] hover:border-white/20"}`}><span className="text-xl text-violet-200">{x.icon}</span><p className="mt-3 font-black text-white">{x.title}</p><p className="mt-1 text-xs leading-5 text-zinc-400">{x.desc}</p></button>)}</div>
  </section>

  <section className="grid gap-6 xl:grid-cols-[1.05fr_.95fr]">
   <div className="space-y-5 rounded-3xl border border-white/10 bg-[#070a16]/70 p-5 backdrop-blur-2xl sm:p-6">
    <div><p className="text-xs font-black uppercase tracking-[.2em] text-cyan-300">2 · Amaç ve brief</p><h2 className="mt-2 text-xl font-black text-white">AI ne hazırlayacağını anlasın</h2></div>
    <div className="flex flex-wrap gap-2">{purposes.map(x=><button key={x} onClick={()=>setPurpose(x)} className={`rounded-full border px-3 py-2 text-xs font-bold ${purpose===x?"border-cyan-400/50 bg-cyan-500/15 text-cyan-100":"border-white/10 text-zinc-400"}`}>{x}</button>)}</div>
    <textarea value={brief} onChange={e=>{setBrief(e.target.value);setImproved(false)}} rows={5} placeholder="Ne istediğini anlat. Bu metin doğrudan paylaşılmayacak; AI bunu anlayıp ayrı bir paylaşım metni hazırlayacak." className="w-full resize-none rounded-2xl border border-white/10 bg-black/25 p-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-violet-400/50"/>

    <label className="block cursor-pointer overflow-hidden rounded-2xl border border-dashed border-white/15 bg-white/[.025] transition hover:border-violet-400/40">
     <input type="file" accept="image/*,video/*" className="hidden" onChange={e=>handleFile(e.target.files?.[0])}/>
     {fileUrl?<div className="space-y-3 p-3">{fileType==="video"?<video src={fileUrl} controls className="max-h-[300px] w-full rounded-xl bg-black object-contain"/>:<img src={fileUrl} alt="Yüklenen referans" className="max-h-[300px] w-full rounded-xl bg-black object-contain"/>}<div className="flex items-center justify-between gap-3 px-1 pb-1"><div className="min-w-0 text-left"><p className="truncate text-sm font-bold text-white">{fileName}</p><p className="text-xs text-zinc-500">Referans dosyan hazır. Değiştirmek için tıkla.</p></div><span className="shrink-0 rounded-lg border border-violet-400/20 bg-violet-500/10 px-3 py-2 text-xs font-bold text-violet-200">Değiştir</span></div></div>:<div className="p-5 text-center"><p className="font-bold text-white">Kendi görselini / videonu veya referans dosyanı ekle</p><p className="mt-1 text-xs text-zinc-500">Dosyayı seçtiğinde burada doğrudan önizlemesini göreceksin.</p></div>}
    </label>

    <div className="rounded-2xl border border-violet-400/15 bg-violet-500/[.055] p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-black text-white">AI ile iyileştir</p><p className="mt-1 text-xs text-zinc-400">Paylaşım metninin tonunu seç; brief’in kendisi paylaşım metnine kopyalanmaz.</p></div><button type="button" onClick={()=>setImproved(true)} className="rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-black text-white transition hover:bg-violet-500">Seçili stille iyileştir</button></div><div className="mt-3 flex flex-wrap gap-2">{improveStyles.map(x=><button type="button" key={x.id} onClick={()=>{setImproveStyle(x.id);setImproved(true)}} className={`rounded-full border px-3 py-2 text-xs font-bold transition ${improveStyle===x.id&&improved?"border-violet-400/50 bg-violet-500/20 text-white":"border-white/10 bg-black/15 text-zinc-400 hover:text-white"}`}>{x.label}</button>)}</div></div>

    <div className="grid gap-3 sm:grid-cols-2"><Link href={mode==="video"?"/video-studio":"/image-studio"} className="rounded-2xl bg-violet-600 px-4 py-3 text-center text-sm font-black text-white transition hover:bg-violet-500">{mode==="edit"?"Dosyayı düzenlemeye başla":mode==="text"?"AI içeriği hazırla":`${mode==="video"?"Videoyu":"Görseli"} üret`}</Link><button type="button" onClick={()=>setImproved(true)} className="rounded-2xl border border-violet-400/30 bg-violet-500/10 px-4 py-3 text-sm font-black text-violet-100 transition hover:bg-violet-500/20">AI metnini hazırla</button></div>
   </div>

   <div className="rounded-3xl border border-white/10 bg-[#070a16]/70 p-5 backdrop-blur-2xl sm:p-6"><p className="text-xs font-black uppercase tracking-[.2em] text-emerald-300">3 · Yayın planı</p><h2 className="mt-2 text-xl font-black text-white">Paylaşmadan önce AI önerisi</h2><div className="mt-5 space-y-3"><Advice title="Önerilen zaman" value={recommendation.time}/><Advice title="Hook" value={recommendation.hook}/><Advice title="CTA" value={recommendation.cta}/><Advice title="İçerik amacı" value={purpose}/></div><p className="mt-4 text-[11px] leading-5 text-zinc-500">Bu alan daha sonra bağlı hesabın gerçek performans verilerine göre kişiselleştirilecek.</p></div>
  </section>

  <section className="rounded-3xl border border-white/10 bg-[#070a16]/70 p-5 backdrop-blur-2xl sm:p-6"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.2em] text-fuchsia-300">4 · Canlı önizleme</p><h2 className="mt-2 text-xl font-black text-white">Paylaşınca nasıl görünecek?</h2></div><div className="flex flex-wrap gap-2">{platforms.map(x=><button key={x} onClick={()=>setPlatform(x)} className={`rounded-full px-3 py-2 text-xs font-bold ${platform===x?"bg-white text-black":"border border-white/10 text-zinc-400"}`}>{x}</button>)}</div></div>
   <div className="mx-auto mt-6 max-w-[620px] overflow-hidden rounded-[28px] border border-white/15 bg-black shadow-2xl"><div className="flex items-center gap-3 border-b border-white/10 p-4"><div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500"/><div><p className="text-sm font-black text-white">markan</p><p className="text-[11px] text-zinc-500">{platform} · şimdi</p></div></div>
    {mode==="text"?<div className="flex min-h-[260px] items-center justify-center bg-gradient-to-br from-[#15182b] via-[#090b14] to-[#25103c] p-10 text-center"><p className="max-w-md text-2xl font-black leading-tight text-white">{previewCaption}</p></div>:fileUrl?<div className="flex max-h-[560px] min-h-[300px] items-center justify-center bg-black">{fileType==="video"?<video src={fileUrl} controls className="max-h-[560px] w-full object-contain"/>:<img src={fileUrl} alt="Platform önizlemesi" className="max-h-[560px] w-full object-contain"/>}</div>:<div className="flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-[#15182b] via-[#090b14] to-[#25103c]"><div className="px-8 text-center"><p className="text-4xl">{mode==="video"?"▶":"✦"}</p><p className="mt-3 text-sm font-bold text-zinc-300">Üretilen {mode==="video"?"video":"görsel"} burada görünecek.</p></div></div>}
    <div className="p-4"><p className="text-sm leading-6 text-zinc-200"><b>markan</b> {previewCaption}</p><p className="mt-3 text-xs text-zinc-500">♡ Beğen &nbsp; ◯ Yorum &nbsp; ↗ Paylaş</p></div></div>
   <div className="mt-5 flex flex-wrap justify-center gap-3"><button type="button" onClick={()=>setImproved(true)} className="rounded-xl border border-violet-400/30 bg-violet-500/10 px-4 py-3 text-sm font-bold text-violet-100">Önizlemeyi AI ile iyileştir</button><Link href="/calendar" className="rounded-xl bg-white px-5 py-3 text-sm font-black text-black">Planla / Paylaş</Link></div>
  </section>
 </div>
}
function Advice({title,value}:{title:string;value:string}){return <div className="rounded-2xl border border-white/8 bg-white/[.035] p-4"><p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">{title}</p><p className="mt-1 text-sm font-semibold leading-6 text-zinc-200">{value}</p></div>}
