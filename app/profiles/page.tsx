import { auth } from "@clerk/nextjs/server";
import { Navbar } from "@/components/layout/Navbar";
import { listUserProfiles } from "@/lib/profiles/server";
import { ProfilesClient } from "./ProfilesClient";

export default async function ProfilesPage() {
  const { userId } = await auth.protect();
  const { storage, profiles } = await listUserProfiles(userId);

  return (
    <main className="min-h-screen bg-[#09090b] text-zinc-100">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <section className="flex-1 px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
          <Navbar title="Profiller">
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
              İşletme, kişisel paylaşım ve içerik üretici ayarlarını ayrı profiller olarak yönet.
            </p>
          </Navbar>
          <div className="pt-6">
            <ProfilesClient initialProfiles={profiles} initialStorage={storage} />
          </div>
        </section>
      </div>
    </main>
  );
}
