"use client";

import { useState } from "react";
import { Button, Card, Input } from "@/components/ui";
import type { ProfileSettings } from "@/lib/content-store";

type SettingsClientProps = { profile: ProfileSettings | null };
type Bg = "aurora" | "nebula" | "midnight" | "minimal" | "custom";
const backgrounds: Array<{id:Bg;name:string;preview:string}> = [
  {id:"aurora",name:"Aurora",preview:"bg-gradient-to-br from-cyan-900 via-indigo-950 to-fuchsia-950"},
  {id:"nebula",name:"Mor Nebula",preview:"bg-gradient-to-br from-violet-950 via-purple-900 to-slate-950"},
  {id:"midnight",name:"Gece",preview:"bg-gradient-to-br from-sky-950 via-slate-950 to-black"},
  {id:"minimal",name:"Koyu Minimal",preview:"bg-gradient-to-br from-zinc-800 to-black"},
];

export function SettingsClient({ profile }: SettingsClientProps) {
  const [form,setForm]=useState({name:profile?.name??"",brand_name:profile?.brand_name??"",brand_colors:profile?.brand_colors??"",target_audience:profile?.target_audience??"",default_language:profile?.default_language??"Türkçe",writing_style:profile?.writing_style??"Profesyonel"});
  const [saved,setSaved]=useState(false);
  const [background,setBackground]=useState<Bg>(()=>typeof window!=="undefined"?(localStorage.getItem("brandflow-background") as Bg)||"aurora":"aurora");
  function updateField(field:keyof typeof form,value:string){setForm(c=>({...c,[field]:value}));setSaved(false)}
  function chooseBackground(value:Bg){setBackground(value);localStorage.setItem("brandflow-background",value);window.dispatchEvent(new Event("brandflow-background-change"))}
  function uploadBackground(event:React.ChangeEvent<HTMLInputElement>){const file=event.target.files?.[0];if(!file)return;if(file.size>5*1024*1024){alert("Arka plan görseli en fazla 5 MB olabilir.");return}const reader=new FileReader();reader.onload=()=>{localStorage.setItem("brandflow-custom-background",String(reader.result));chooseBackground("custom")};reader.readAsDataURL(file)}
  async function saveSettings(){const response=await fetch("/api/profile",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});setSaved(response.ok)}
  return <div className="space-y-6">
    <Card className="p-5"><h2 className="text-lg font-bold text-white">Görünüm</h2><p className="mt-1 text-sm text-zinc-400">BrandFlow arka planını seç. Hareketli ışıklar ve gezegenler otomatik çalışır.</p><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{backgrounds.map(bg=><button key={bg.id} onClick={()=>chooseBackground(bg.id)} className={`overflow-hidden rounded-xl border text-left transition ${background===bg.id?"border-violet-400 ring-2 ring-violet-500/30":"border-white/10 hover:border-white/30"}`}><div className={`h-24 ${bg.preview}`}><div className="h-full bg-[radial-gradient(circle_at_70%_30%,rgba(255,255,255,.25),transparent_18%)]"/></div><div className="bg-black/40 px-3 py-2 text-sm font-semibold text-white">{bg.name}</div></button>)}</div><label className={`mt-4 flex cursor-pointer items-center justify-between rounded-xl border p-4 ${background==="custom"?"border-violet-400 bg-violet-500/10":"border-white/10 bg-black/20"}`}><span><b className="text-white">Kendi arka planını ekle</b><span className="block text-xs text-zinc-400">Galerinden JPG, PNG veya WEBP seç.</span></span><span className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-bold text-white">Galeriden Seç</span><input className="hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadBackground}/></label></Card>
    <Card className="p-5"><h2 className="mb-5 text-lg font-bold text-white">Marka Ayarları</h2><div className="grid gap-5 md:grid-cols-2"><Input label="Ad" value={form.name} onChange={e=>updateField("name",e.target.value)}/><Input label="Marka Adı" value={form.brand_name} onChange={e=>updateField("brand_name",e.target.value)}/><Input label="Marka Renkleri" value={form.brand_colors} placeholder="#8b5cf6, #09090b" onChange={e=>updateField("brand_colors",e.target.value)}/><Input label="Hedef Kitle" value={form.target_audience} onChange={e=>updateField("target_audience",e.target.value)}/><Input label="Varsayılan Dil" value={form.default_language} onChange={e=>updateField("default_language",e.target.value)}/><Input label="Yazım Tarzı" value={form.writing_style} onChange={e=>updateField("writing_style",e.target.value)}/></div><div className="mt-6 flex items-center gap-3"><Button type="button" onClick={saveSettings}>Kaydet</Button>{saved&&<p className="text-sm text-emerald-300">Ayarlar kaydedildi.</p>}</div></Card>
  </div>;
}
