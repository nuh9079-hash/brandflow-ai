import { auth } from "@clerk/nextjs/server";
import { Sidebar } from "@/components/layout/Sidebar";
import OpportunitiesClient from "./OpportunitiesClient";

export default async function OpportunitiesPage(){
 await auth.protect();
 return <main className="min-h-screen text-zinc-100"><div className="flex min-h-screen flex-col lg:flex-row"><Sidebar active="Fırsatlar"/><section className="min-w-0 flex-1 px-5 py-6 sm:px-8 lg:px-10 lg:py-8"><div className="max-w-5xl"><p className="text-xs font-black uppercase tracking-[.2em] text-amber-300">Fırsatlar</p><h1 className="mt-2 text-3xl font-black">Büyüme fırsatlarını tek yerde topla</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">Mevcut AI analizlerinden çıkan kampanya, içerik ve büyüme fikirlerini kaybetmeden takip et.</p><div className="mt-7"><OpportunitiesClient/></div></div></section></div></main>
}
