import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { UpcomingScheduledPosts } from "@/components/calendar/UpcomingScheduledPosts";
import { listGeneratedContents } from "@/lib/content-store";
import { getSocialProviderStatuses } from "@/lib/social/providers";
import { PublishCenterClient } from "./PublishCenterClient";

export default async function PublishPage() {
  const { userId } = await auth.protect();
  const [items, providerStatuses] = await Promise.all([
    listGeneratedContents(userId, { limit: 50 }),
    getSocialProviderStatuses(),
  ]);
  return <main className="min-h-screen bg-[#09090b] text-zinc-100"><div className="flex min-h-screen flex-col lg:flex-row"><Sidebar active="Paylaşım & Takvim"/><section className="min-w-0 flex-1 px-5 py-6 sm:px-8 lg:px-10 lg:py-8"><Navbar title="Paylaşım & Takvim"><p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">İçeriklerini hazırla, hesaplarını kontrol et, yayınla veya doğru güne planla.</p><div className="mt-4 flex flex-wrap gap-2"><Link href="/calendar" className="rounded-xl border border-violet-400/20 bg-violet-500/10 px-4 py-2 text-xs font-black text-violet-200">Tam takvimi aç</Link><Link href="/profiles" className="rounded-xl border border-white/10 bg-white/[.04] px-4 py-2 text-xs font-black text-zinc-300">Sosyal hesaplar</Link></div></Navbar><div className="grid gap-5 pt-6 2xl:grid-cols-[1fr_320px]"><PublishCenterClient initialItems={items} providerStatuses={providerStatuses}/><div className="[&>*]:!border-white/10 [&>*]:!bg-[#070a16]/70 [&>*]:!backdrop-blur-2xl"><UpcomingScheduledPosts/></div></div></section></div></main>;
}
