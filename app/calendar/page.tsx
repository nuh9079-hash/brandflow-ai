import { auth } from "@clerk/nextjs/server";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import { CalendarClient } from "./CalendarClient";

export default async function CalendarPage(){await auth.protect();return <main className="min-h-screen bg-[#09090b] text-zinc-100"><div className="flex min-h-screen flex-col lg:flex-row"><Sidebar active="Paylaşım & Takvim"/><section className="flex-1 px-5 py-6 sm:px-8 lg:px-10 lg:py-8"><Navbar title="Paylaşım & Takvim"><p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">İçeriğini, platformunu ve saatini tek yerde seç. İstersen yalnızca takvime hatırlatma olarak ekle; hesabın ve sunucu zamanlayıcısı hazırsa <b className="text-zinc-200">Otomatik yayınla</b> seçeneğini aç ve BrandFlow zamanı geldiğinde sen uygulamayı açmadan paylaşsın.</p></Navbar><div className="pt-6"><CalendarClient/></div></section></div></main>}
