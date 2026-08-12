import { auth } from "@clerk/nextjs/server";
import { Navbar } from "@/components/layout/Navbar";
import { MediaCenterClient } from "./MediaCenterClient";

export default async function MediaPage() {
  await auth.protect();

  return (
    <main className="min-h-screen bg-[#09090b] text-zinc-100">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <section className="flex-1 px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
          <Navbar title="Medya Merkezi">
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
              Markana ait görsel, video ve logoları tek yerde görüntüle.
            </p>
          </Navbar>
          <div className="pt-6">
            <MediaCenterClient />
          </div>
        </section>
      </div>
    </main>
  );
}
