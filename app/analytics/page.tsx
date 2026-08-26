import { auth } from "@clerk/nextjs/server";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { AnalyticsClient } from "./AnalyticsClient";

export default async function AnalyticsPage(){await auth?.protect();return <main className="min-h-screen bg-[#09090b] text-zinc-100"><div className="flex min-h-screen flex-col lg:flex-row"><Sidebar active="Analizler"/><section className="min-w-0 flex-1 px-5 py-6 sm:px-8 lg:px-10 lg:py-8"><Navbar title="Analizler"><p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">Medya, planlama ve AI analizlerini gerçek BrandFlow verileriyle takip et.</p></Navbar><div className="pt-6"><AnalyticsClient/></div></section></div></main>}
