import { auth } from "@clerk/nextjs/server";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import { getProfile } from "@/lib/content-store";
import { SettingsClient } from "./SettingsClient";

export default async function SettingsPage() {
  const { userId } = await auth.protect();
  const profile = await getProfile(userId);

  return (
    <main className="min-h-screen bg-[#09090b] text-zinc-100">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <Sidebar active="Settings" />
        <section className="flex-1 px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
          <Navbar title="Settings">
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">Marka hafızasını ve varsayılan üretim tercihlerini yönet.</p>
          </Navbar>
          <div className="pt-6">
            <SettingsClient profile={profile} />
          </div>
        </section>
      </div>
    </main>
  );
}
