import { auth } from "@clerk/nextjs/server";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import { listGeneratedContents } from "@/lib/content-store";
import { HistoryClient } from "../history/HistoryClient";

export default async function FavoritesPage() {
  const { userId } = await auth.protect();
  const items = await listGeneratedContents(userId, { favoritesOnly: true });

  return (
    <main className="min-h-screen bg-[#09090b] text-zinc-100">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <Sidebar active="Favorites" />
        <section className="flex-1 px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
          <Navbar title="Favorites">
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">Kaydettiğin en iyi içerikleri burada tut.</p>
          </Navbar>
          <div className="pt-6">
            <HistoryClient
              initialItems={items}
              emptyTitle="Favori içerik yok"
              emptyDescription="History ekranından iyi içerikleri favoriye ekleyebilirsin."
            />
          </div>
        </section>
      </div>
    </main>
  );
}
