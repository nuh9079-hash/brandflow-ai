import { auth } from "@clerk/nextjs/server";
import { Navbar } from "@/components/layout/Navbar";
import { ConnectionsClient } from "./ConnectionsClient";

export default async function ConnectionsPage({ searchParams }: { searchParams: Promise<{ instagram?: string; code?: string }> }) {
  await auth.protect();
  const query = await searchParams;
  return (
    <main className="min-h-screen bg-[#09090b] text-zinc-100">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <section className="flex-1 px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
          <Navbar title="Sosyal Bağlantılar">
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
              Otomatik paylaşım için sosyal hesaplarını güvenli biçimde yönet.
            </p>
          </Navbar>
          <div className="pt-6"><ConnectionsClient instagramResult={query.instagram} instagramErrorCode={query.code} /></div>
        </section>
      </div>
    </main>
  );
}
