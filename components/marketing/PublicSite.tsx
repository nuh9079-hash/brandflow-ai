import Link from "next/link";
import type { ReactNode } from "react";

export function PublicHeader() {
  return <header className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-5 border-b border-white/10 py-6">
    <Link href="/" className="text-lg font-black text-white">BrandFlow <span className="text-violet-300">AI</span></Link>
    <nav aria-label="Tanıtım menüsü" className="flex flex-wrap items-center gap-5 text-sm text-zinc-300">
      <Link href="/features">Özellikler</Link><Link href="/about">Hakkında</Link>
      <Link href="/sign-in">Giriş yap</Link><Link href="/sign-up" className="rounded-xl bg-violet-600 px-4 py-2 font-bold text-white">Ücretsiz başla</Link>
    </nav>
  </header>;
}
export function PublicFooter() {
  return <footer className="mx-auto mt-12 grid w-full max-w-7xl gap-6 border-t border-white/10 py-8 text-sm text-zinc-400 sm:grid-cols-2">
    <div><Link href="/" className="font-black text-zinc-200">BrandFlow AI</Link><p className="mt-2">Fikrini içeriğe dönüştür, düzenle ve planla.</p><p className="mt-4 text-xs">© 2026 BrandFlow AI</p></div>
    <nav aria-label="Alt menü" className="flex flex-wrap gap-x-6 gap-y-3 sm:justify-end"><Link href="/features">Özellikler</Link><Link href="/about">Hakkında</Link><Link href="/sign-in">Giriş yap</Link><Link href="/sign-up">Hesap oluştur</Link></nav>
  </footer>;
}
export function PublicPage({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return <div className="min-h-screen px-5 text-zinc-100 sm:px-8"><PublicHeader /><main className="mx-auto max-w-5xl py-16"><p className="text-sm font-bold uppercase tracking-widest text-violet-300">BrandFlow AI</p><h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">{title}</h1><p className="mt-6 max-w-3xl text-lg leading-8 text-zinc-400">{intro}</p>{children}<div className="mt-12 rounded-3xl border border-violet-300/20 bg-violet-500/10 p-8"><h2 className="text-2xl font-bold">İlk içeriğini hazırla</h2><p className="mt-3 text-zinc-300">Hesabını oluştur, markanı anlat ve içerik akışına başla.</p><Link href="/sign-up" className="mt-6 inline-flex rounded-xl bg-violet-600 px-5 py-3 font-bold text-white">Hesap oluştur →</Link></div></main><PublicFooter /></div>;
}
