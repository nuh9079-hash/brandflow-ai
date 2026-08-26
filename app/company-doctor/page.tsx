import { auth } from "@clerk/nextjs/server";
import { Sidebar } from "@/components/layout/Sidebar";
import CompanyDoctorClient from "./CompanyDoctorClient";

export default async function CompanyDoctorPage(){
 await auth?.protect();
 return <main className="min-h-screen text-zinc-100"><div className="flex min-h-screen flex-col lg:flex-row"><Sidebar active="Şirket Doktoru"/><section className="min-w-0 flex-1 px-5 py-6 sm:px-8 lg:px-10 lg:py-8"><div className="max-w-5xl"><p className="text-xs font-black uppercase tracking-[.2em] text-violet-300">Şirket Doktoru</p><h1 className="mt-2 text-3xl font-black">Markanın güçlü ve zayıf noktalarını gör</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">BrandFlow içindeki gerçek analiz kayıtlarını kullanarak sorunları, riskleri ve büyüme alanlarını tek ekranda özetler.</p><div className="mt-7"><CompanyDoctorClient/></div></div></section></div></main>
}
