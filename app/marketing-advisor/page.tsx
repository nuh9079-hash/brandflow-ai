import { auth } from "@clerk/nextjs/server";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import { MarketingAdvisorClient } from "./MarketingAdvisorClient";

export default async function MarketingAdvisorPage(){await auth?.protect();return <main className="min-h-screen bg-[#09090b] text-zinc-100"><div className="flex min-h-screen flex-col lg:flex-row"><Sidebar/><section className="flex-1 px-5 py-6 sm:px-8 lg:px-10 lg:py-8"><Navbar title="İçerik Analizi"><p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">Görsel, video, paylaşım metni ve marka profilini birlikte analiz et; platforma göre daha iyi CTA, hashtag, zamanlama ve içerik önerileri al.</p></Navbar><div className="pt-6"><MarketingAdvisorClient/></div></section></div></main>}
