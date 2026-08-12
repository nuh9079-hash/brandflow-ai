import { auth } from "@clerk/nextjs/server";
import { Navbar } from "@/components/layout/Navbar";
import { VideoStudioClient } from "./VideoStudioClient";

export default async function VideoStudioPage() {
  await auth.protect();

  return (
    <main className="min-h-screen bg-[#09090b] text-zinc-100">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <section className="flex-1 px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
          <Navbar title="AI Video Studio">
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
              Markan için kısa sosyal medya videoları hazırla, Medya Merkezine kaydet ve indir.
            </p>
          </Navbar>
          <div className="pt-6">
            <VideoStudioClient />
          </div>
        </section>
      </div>
    </main>
  );
}
