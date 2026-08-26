import { auth } from "@clerk/nextjs/server";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import { ImageStudioClient } from "./ImageStudioClient";

export default async function ImageStudioPage() {
  await auth?.protect();

  return (
    <main className="min-h-screen bg-[#09090b] text-zinc-100">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <Sidebar active="AI Image Studio" />
        <section className="flex-1 px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
          <Navbar title="AI Image Studio">
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
              Markan için sosyal medya görselleri üret, indir ve Medya Merkezine kaydet.
            </p>
          </Navbar>
          <div className="pt-6">
            <ImageStudioClient />
          </div>
        </section>
      </div>
    </main>
  );
}
