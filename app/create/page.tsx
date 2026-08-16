import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import BrandFlowDashboard from "../BrandFlowDashboard";
import { Sidebar } from "@/components/layout/Sidebar";

export default async function CreatePage() {
  await auth.protect();

  return (
    <main className="min-h-screen text-zinc-100">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <Sidebar active="İçerik Üret" />
        <section className="min-w-0 flex-1 px-4 py-5 sm:px-7 lg:px-9 lg:py-7">
          <div className="mb-6 rounded-3xl border border-white/10 bg-[#070a16]/65 p-5 backdrop-blur-2xl">
            <p className="text-xs font-bold uppercase tracking-[.18em] text-violet-300">İçerik Üretim Merkezi</p>
            <h1 className="mt-2 text-2xl font-black text-white">Ne üretmek istiyorsun?</h1>
            <p className="mt-2 text-sm text-zinc-400">Metin, görsel ve videoyu tek yerden başlat. Sol menü bu sayfada da görünür kalır.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <a href="#icerik-formu" className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-4 transition hover:-translate-y-0.5 hover:border-violet-300/40"><p className="text-lg">✦</p><p className="mt-2 font-black text-white">Yazı / İçerik Üret</p><p className="mt-1 text-xs text-zinc-400">Caption, senaryo, fikir ve içerik planı.</p></a>
              <Link href="/image-studio" className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-4 transition hover:-translate-y-0.5 hover:border-cyan-300/40"><p className="text-lg">◫</p><p className="mt-2 font-black text-white">Görsel Üret</p><p className="mt-1 text-xs text-zinc-400">AI ile sosyal medya görselleri hazırla.</p></Link>
              <Link href="/video-studio" className="rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/10 p-4 transition hover:-translate-y-0.5 hover:border-fuchsia-300/40"><p className="text-lg">▶</p><p className="mt-2 font-black text-white">Video Üret</p><p className="mt-1 text-xs text-zinc-400">Kısa video üretim merkezini aç.</p></Link>
              <Link href="/media" className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 transition hover:-translate-y-0.5 hover:border-emerald-300/40"><p className="text-lg">▣</p><p className="mt-2 font-black text-white">Medya Merkezi</p><p className="mt-1 text-xs text-zinc-400">Ürettiğin ve yüklediğin dosyaları yönet.</p></Link>
            </div>
          </div>
          <div id="icerik-formu"><BrandFlowDashboard /></div>
        </section>
      </div>
    </main>
  );
}
