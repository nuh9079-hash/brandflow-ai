import { auth } from "@clerk/nextjs/server";
import { Sidebar } from "@/components/layout/Sidebar";
import { ContentCreationFlow } from "@/components/create/ContentCreationFlow";

export default async function CreatePage() {
  await auth?.protect();
  return (
    <main className="min-h-screen text-zinc-100">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <Sidebar active="İçerik Üret" />
        <section className="min-w-0 flex-1 px-4 py-5 sm:px-7 lg:px-9 lg:py-7">
          <div className="mb-6">
            <p className="text-xs font-black uppercase tracking-[.22em] text-violet-300">BrandFlow İçerik Stüdyosu</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">Fikirden paylaşıma, tek akış.</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">Ne paylaşmak istediğini anlat; görsel, video veya metin seç. Dosyanı ekle ya da sıfırdan üret, AI yayın planını hazırlasın ve paylaşmadan önce platformdaki görünümünü kontrol et.</p>
          </div>
          <ContentCreationFlow />
        </section>
      </div>
    </main>
  );
}
