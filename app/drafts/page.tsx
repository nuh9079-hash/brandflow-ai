import { auth } from "@clerk/nextjs/server";
import { Navbar } from "@/components/layout/Navbar";
import { listDrafts } from "@/lib/drafts/server";
import { DraftsClient } from "./DraftsClient";

export default async function DraftsPage() {
  const { userId } = await auth.protect();
  const result = await listDrafts(userId);

  return (
    <main className="min-h-screen bg-[#09090b] text-zinc-100">
      <section className="px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
        <Navbar title="Taslaklar">
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">Paylaşmaya hazır olmadığın içerikleri kaydet ve daha sonra kaldığın yerden devam et.</p>
        </Navbar>
        <div className="pt-6">
          <DraftsClient initialDrafts={result.ok ? result.data : []} initialError={result.ok ? "" : result.error} />
        </div>
      </section>
    </main>
  );
}
