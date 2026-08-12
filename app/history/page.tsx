import { auth } from "@clerk/nextjs/server";
import { Navbar } from "@/components/layout/Navbar";
import { listGeneratedContents } from "@/lib/content-store";
import { HistoryClient } from "./HistoryClient";
import { listPublishAttempts } from "@/lib/publishing/server";
import { PublishHistoryClient } from "./PublishHistoryClient";

export default async function HistoryPage() {
  const { userId } = await auth.protect();
  const [items, publishHistory] = await Promise.all([listGeneratedContents(userId), listPublishAttempts(userId)]);

  return (
    <main className="min-h-screen bg-[#09090b] text-zinc-100">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <section className="flex-1 px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
          <Navbar title="History">
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">Üretilen tüm içerikleri ara, filtrele, favorile, tekrar aç veya sil.</p>
          </Navbar>
          <div className="pt-6">
            <PublishHistoryClient initialItems={publishHistory.ok ? publishHistory.data : []} initialError={publishHistory.ok ? "" : publishHistory.error} />
            <div className="mt-10 border-t border-white/10 pt-8">
              <h2 className="mb-4 text-lg font-black text-white">AI İçerik Geçmişi</h2>
            <HistoryClient
              initialItems={items}
              emptyTitle="Henüz içerik yok"
              emptyDescription="Create ekranından ilk AI içeriğini üretince burada otomatik görünecek."
            />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
