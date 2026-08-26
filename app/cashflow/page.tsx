import { auth } from "@clerk/nextjs/server";
import { Sidebar } from "@/components/layout/Sidebar";
import CashFlowClient from "./CashFlowClient";

export default async function CashFlowPage(){
 await auth?.protect();
 return <main className="min-h-screen text-zinc-100"><div className="flex min-h-screen flex-col lg:flex-row"><Sidebar active="Hesap Akışı"/><section className="min-w-0 flex-1 px-5 py-6 sm:px-8 lg:px-10 lg:py-8"><div className="max-w-6xl"><p className="text-xs font-black uppercase tracking-[.2em] text-emerald-300">Hesap Akışı</p><h1 className="mt-2 text-3xl font-black">Gelir ve giderlerini sade şekilde takip et</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">BrandFlow muhasebe uygulaması değil; burada pazarlama kararlarını destekleyecek temel nakit akışını tutarsın.</p><div className="mt-7"><CashFlowClient/></div></div></section></div></main>
}
