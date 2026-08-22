import { auth } from "@clerk/nextjs/server";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import { InstagramConnectionCard } from "@/components/social/InstagramConnectionCard";
import { listUserProfiles } from "@/lib/profiles/server";
import { ProfilesClient } from "./ProfilesClient";

export default async function ProfilesPage(){const{userId}=await auth.protect();const{storage,profiles}=await listUserProfiles(userId);return <main className="min-h-screen bg-[#09090b] text-zinc-100"><div className="flex min-h-screen flex-col lg:flex-row"><Sidebar active="Sosyal Hesaplar"/><section className="flex-1 px-5 py-6 sm:px-8 lg:px-10 lg:py-8"><Navbar title="Sosyal Hesaplar & Profiller"><p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">Hesaplarını bağla; BrandFlow içeriklerini planlanan tarihte sen uygulamayı açmadan yayınlayabilsin.</p></Navbar><div className="pt-6"><InstagramConnectionCard/><ProfilesClient initialProfiles={profiles} initialStorage={storage}/></div></section></div></main>}
