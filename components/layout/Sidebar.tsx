import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { ProfileSwitcher } from "@/components/profiles/ProfileSwitcher";

type NavItem={href:string;label:string;hint?:string};
type NavGroup={title:string;items:NavItem[]};

const groups:NavGroup[]=[
 {title:"Başla",items:[
  {href:"/",label:"Ana Sayfa",hint:"Bugün ne yapacağını gör"},
  {href:"/create",label:"İçerik Üret",hint:"Tek akışta hazırla"},
 ]},
 {title:"Üretim",items:[
  {href:"/image-studio",label:"Görsel Üret",hint:"Görsel oluştur veya düzenle"},
  {href:"/video-studio",label:"Video Üret",hint:"Reels, TikTok, Shorts"},
  {href:"/media",label:"Medya Merkezi",hint:"Dosyalarını yönet"},
 ]},
 {title:"Yayınla",items:[
  {href:"/calendar",label:"Paylaşım & Takvim",hint:"Önizle, planla, otomatik yayınla"},
  {href:"/publish",label:"Yayın Merkezi",hint:"Hazır içerikleri kontrol et ve yayınla"},
  {href:"/profiles",label:"Sosyal Hesaplar",hint:"Hesap bağlantılarını ve marka profillerini yönet"},
 ]},
 {title:"Büyüt",items:[
  {href:"/analytics",label:"Analizler",hint:"Neyin çalıştığını gör"},
  {href:"/opportunities",label:"Fırsatlar",hint:"Yeni büyüme fikirleri"},
  {href:"/company-doctor",label:"Şirket Doktoru",hint:"Sorunları ve aksiyonları gör"},
 ]},
 {title:"İşletme",items:[
  {href:"/cashflow",label:"Hesap Akışı",hint:"Gelir ve giderleri izle"},
  {href:"/settings",label:"Ayarlar",hint:"BrandFlow'u kendine göre ayarla"},
  {href:"/billing",label:"Plan & Faturalandırma",hint:"Planını yönet"},
 ]},
];

type SidebarProps={active?:string};

function NavLink({item,active,compact=false}:{item:NavItem;active:string;compact?:boolean}){
 const selected=active===item.label;
 return <Link href={item.href} className={`group block rounded-xl border px-3 py-2.5 transition ${selected?"border-violet-400/30 bg-violet-600/20 text-white":"border-transparent text-zinc-400 hover:border-white/10 hover:bg-white/[.04] hover:text-white"}`}>
  <div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold">{item.label}</span>{selected&&<span className="h-2 w-2 rounded-full bg-violet-400 shadow-[0_0_12px_rgba(167,139,250,.8)]"/>}</div>
  {!compact&&item.hint&&<p className="mt-1 text-[11px] leading-4 text-zinc-600 transition group-hover:text-zinc-500">{item.hint}</p>}
 </Link>
}

export function Sidebar({active="Ana Sayfa"}:SidebarProps){
 const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
 return <aside className="border-b border-white/10 bg-[#070811]/88 px-4 py-4 backdrop-blur-2xl lg:min-h-screen lg:w-72 lg:border-b-0 lg:border-r lg:px-5 lg:py-6">
  <div className="flex items-center justify-between gap-3">
   <Link href="/" className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-700 text-sm font-black text-white shadow-lg shadow-violet-500/20">BF</div><div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-violet-300">Intelligence</p><h1 className="text-lg font-bold text-white">BrandFlow AI</h1></div></Link>
   <details className="relative lg:hidden"><summary className="cursor-pointer list-none rounded-xl border border-white/10 bg-white/[.04] px-3 py-2 text-sm font-bold text-white">Menü</summary><div className="absolute right-0 z-[70] mt-2 w-[min(84vw,340px)] rounded-2xl border border-white/10 bg-[#090a13]/98 p-3 shadow-2xl backdrop-blur-2xl">{groups.map(group=><div key={group.title} className="mb-3 last:mb-0"><p className="mb-1 px-2 text-[10px] font-black uppercase tracking-[.18em] text-zinc-600">{group.title}</p><div className="grid gap-1">{group.items.map(item=><NavLink key={item.href} item={item} active={active} compact/>)}</div></div>)}</div></details>
  </div>

  <div className="mt-6 hidden lg:block">
   {groups.map(group=><div key={group.title} className="mb-5 last:mb-0"><p className="mb-1.5 px-3 text-[10px] font-black uppercase tracking-[.2em] text-zinc-600">{group.title}</p><nav className="space-y-1">{group.items.map(item=><NavLink key={item.href} item={item} active={active}/>)}</nav></div>)}
  </div>

  <Card className="mt-8 hidden border-violet-400/10 bg-black/20 p-4 backdrop-blur-xl lg:block"><p className="text-xs uppercase tracking-[.18em] text-violet-300">BrandFlow</p><p className="mt-2 font-semibold text-white">Bir sonraki adımın belli olsun</p><p className="mt-1 text-xs leading-5 text-zinc-400">İçerik üret, önizle, planla ve sonuçları aynı akışta takip et.</p><Link href="/create" className="mt-3 block rounded-xl bg-violet-600 px-3 py-2 text-center text-xs font-black text-white">Yeni içerik hazırla</Link></Card>
  {clerkEnabled && <div className="mt-4 hidden lg:block"><ProfileSwitcher compact/></div>}
 </aside>
}
