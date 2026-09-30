import Link from "next/link";

const features = [
  ["✦", "AI içerik üretimi", "Markanı, hedef kitleni ve tonunu anlayan içerikler oluştur."],
  ["▣", "Akıllı takvim", "Paylaşımlarını tek takvimde planla, önizle ve yönet."],
  ["↗", "Sonuçları gör", "Hangi içeriğin büyüme sağladığını analizlerle takip et."],
] as const;

const steps = [
  ["01", "Markanı tanıt", "Hedeflerini ve tarzını BrandFlow'a anlat."],
  ["02", "İçeriklerini oluştur", "AI önerilerini incele, düzenle ve planla."],
  ["03", "Paylaş ve büyü", "Tüm sonuçlarını tek merkezden takip et."],
] as const;

function MiniChart() {
  return (
    <svg viewBox="0 0 320 104" className="h-28 w-full" role="img" aria-label="Örnek verilerle büyüme grafiği">
      <defs><linearGradient id="chart-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#8b5cf6" stopOpacity=".35" /><stop offset="1" stopColor="#8b5cf6" stopOpacity="0" /></linearGradient></defs>
      <path d="M0 88 C28 78 28 62 54 69 C81 76 86 47 113 53 C138 59 142 30 169 40 C194 50 202 26 226 31 C250 36 260 12 286 21 C301 26 307 14 320 7 V104 H0Z" fill="url(#chart-fill)" />
      <path d="M0 88 C28 78 28 62 54 69 C81 76 86 47 113 53 C138 59 142 30 169 40 C194 50 202 26 226 31 C250 36 260 12 286 21 C301 26 307 14 320 7" fill="none" stroke="#a78bfa" strokeWidth="3" />
      <circle cx="286" cy="21" r="5" fill="#fff" stroke="#a78bfa" strokeWidth="3" />
    </svg>
  );
}

function DashboardPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[610px] rotate-[1deg] rounded-[28px] border border-violet-300/30 bg-[#11152b]/95 p-3 shadow-[0_35px_100px_rgba(104,56,210,.38)] sm:p-4">
      <div className="absolute -inset-5 -z-10 rounded-[44px] bg-violet-600/20 blur-3xl" />
      <div className="flex items-center justify-between border-b border-white/10 px-2 pb-3">
        <div className="flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-violet-400 to-indigo-700 text-xs font-black">BF</span><span className="text-xs font-black text-white">BrandFlow <b className="text-violet-300">AI</b></span></div>
        <div className="flex items-center gap-2 text-[10px] text-zinc-500"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Örnek panel <span className="ml-2 grid h-6 w-6 place-items-center rounded-full bg-violet-400/20 text-violet-200">M</span></div>
      </div>
      <div className="grid gap-3 pt-3 md:grid-cols-[1.25fr_.75fr]">
        <div className="space-y-3">
          <div className="rounded-2xl border border-white/10 bg-white/[.04] p-3">
            <div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-violet-300">AI içerik önerileri</p><p className="mt-1 text-xs text-zinc-500">Bugün ne paylaşmak istersin?</p></div><span className="rounded-lg bg-violet-500 px-2 py-1 text-[10px] font-bold text-white">AI ile oluştur</span></div>
            <div className="mt-3 grid grid-cols-3 gap-2">{["Kahve", "Sınırlarını keşfet", "Küçük adımlar"].map((item, index) => <div key={item} className="rounded-xl border border-white/10 bg-[#171d3b] p-2"><div className={`h-10 rounded-lg ${index === 0 ? "bg-gradient-to-br from-amber-200/70 to-orange-700/60" : index === 1 ? "bg-gradient-to-br from-cyan-200/50 to-indigo-700/70" : "bg-gradient-to-br from-emerald-200/40 to-teal-800/70"}`} /><p className="mt-2 truncate text-[10px] font-bold text-zinc-200">{item}</p><p className="mt-1 text-[9px] text-violet-300">Kullan →</p></div>)}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[.04] p-3"><div className="flex items-center justify-between"><p className="text-[10px] font-bold uppercase tracking-[.14em] text-cyan-300">İçerik takvimi</p><span className="text-[10px] text-zinc-500">Örnek hafta</span></div><div className="mt-3 grid grid-cols-7 gap-1 text-center text-[9px] text-zinc-600">{["Pzt", "Sal", "Çar", "Per", "Cum", "Cts", "Paz"].map(day => <span key={day}>{day}</span>)}{Array.from({ length: 14 }, (_, index) => <span key={index} className={`rounded-md py-1.5 ${index === 10 ? "bg-violet-500 font-bold text-white" : "bg-black/20 text-zinc-400"}`}>{index + 1}</span>)}</div></div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[.04] p-3"><div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-zinc-500">Bu ayın performansı</p><p className="mt-2 text-2xl font-black text-white">+42.6%</p></div><span className="rounded-full bg-emerald-400/10 px-2 py-1 text-[9px] font-bold text-emerald-300">↑ büyüme</span></div><div className="mt-5"><MiniChart /></div><div className="mt-3 grid grid-cols-2 gap-2"><div className="rounded-xl bg-black/20 p-2"><p className="text-[9px] text-zinc-500">Erişim</p><p className="mt-1 font-black text-white">158.2K</p></div><div className="rounded-xl bg-black/20 p-2"><p className="text-[9px] text-zinc-500">Etkileşim</p><p className="mt-1 font-black text-white">12.4K</p></div></div></div>
      </div>
      <p className="px-2 pt-3 text-center text-xs leading-5 text-zinc-400">Tanıtım amaçlı örnek ekran. Sayılar gerçek kullanıcı sonuçlarını göstermez.</p>
    </div>
  );
}

export default function LandingPage({ clerkEnabled }: { clerkEnabled: boolean }) {
  const startHref = clerkEnabled ? "/sign-up" : "/create";
  return (
    <main className="min-h-screen overflow-hidden px-5 pb-16 text-zinc-100 sm:px-8">
      <header className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 py-6">
        <Link href="/" className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-violet-400 to-indigo-700 text-sm font-black shadow-lg shadow-violet-500/25">BF</span><span className="text-lg font-black tracking-tight">BrandFlow <b className="text-violet-300">AI</b></span></Link>
        <nav className="hidden items-center gap-7 text-sm font-semibold text-zinc-400 lg:flex"><a href="#ozellikler" className="transition hover:text-white">Özellikler</a><a href="#nasil-calisir" className="transition hover:text-white">Nasıl çalışır?</a><a href="#sonuc" className="transition hover:text-white">Sonuçlar</a></nav>
        <div className="flex w-full items-center gap-2 sm:w-auto"><Link href="/sign-in" className="flex-1 whitespace-nowrap rounded-xl border border-white/10 bg-white/[.04] px-4 py-2.5 text-center sm:flex-none text-sm font-bold text-zinc-200 transition hover:border-violet-300/40 hover:bg-white/[.08]">Giriş yap</Link><Link href={startHref} className="flex-1 whitespace-nowrap rounded-xl bg-violet-600 px-4 py-2.5 text-center sm:flex-none text-sm font-black text-white shadow-lg shadow-violet-600/25 transition hover:bg-violet-500">Ücretsiz başla</Link></div>
      </header>

      <section className="mx-auto grid max-w-7xl items-center gap-12 pb-20 pt-12 lg:grid-cols-[.84fr_1.16fr] lg:gap-10 lg:pb-28 lg:pt-20">
        <div><div className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-4 py-2 text-xs font-black text-violet-200"><span className="text-sm">✦</span> Yapay zekâ ile daha güçlü markalar</div><h1 className="mt-7 max-w-xl text-5xl font-black leading-[.98] tracking-[-.055em] text-white sm:text-7xl">Markanı tek <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-indigo-400 bg-clip-text text-transparent">ekrandan büyüt.</span></h1><p className="mt-7 max-w-lg text-base leading-7 text-zinc-400 sm:text-lg">Ürününü anlat, markana uygun paylaşım metinleri hazırla. İçeriğini düzenle, önizle ve takvimine ekle; tüm taslaklarını tek yerde yönet.</p><div className="mt-8 flex flex-wrap gap-3"><Link href={startHref} className="rounded-2xl bg-violet-600 px-6 py-3.5 text-sm font-black text-white shadow-[0_12px_35px_rgba(124,58,237,.35)] transition hover:-translate-y-0.5 hover:bg-violet-500">Ücretsiz başla <span className="ml-2">→</span></Link><a href="#nasil-calisir" className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-black/20 px-6 py-3.5 text-sm font-bold text-zinc-200 transition hover:bg-white/[.07]"><span className="grid h-6 w-6 place-items-center rounded-full border border-white/20 text-[10px]">▶</span> Nasıl çalışır?</a></div><div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-zinc-500"><span>✓ Kredi kartı gerekmez</span><span>✓ Kurulumu kolay</span><span>✓ Her ölçekte marka için</span></div></div>
        <DashboardPreview />
      </section>

      <section id="ozellikler" className="mx-auto max-w-7xl border-t border-white/10 py-14"><div className="grid gap-4 md:grid-cols-3">{features.map(([icon, title, text]) => <div key={title} className="rounded-3xl border border-white/10 bg-[#070a16]/60 p-6 backdrop-blur-xl transition hover:-translate-y-1 hover:border-violet-400/30"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-400/10 text-xl text-violet-300">{icon}</div><h2 className="mt-5 text-lg font-black text-white">{title}</h2><p className="mt-2 text-sm leading-6 text-zinc-500">{text}</p></div>)}</div></section>

      <section id="nasil-calisir" className="mx-auto max-w-7xl py-14"><div className="mx-auto max-w-2xl text-center"><p className="text-xs font-black uppercase tracking-[.24em] text-violet-300">Basit bir akış</p><h2 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">Fikrin paylaşılabilir hale gelsin.</h2><p className="mt-4 text-zinc-500">Markanı tanıt, doğru içeriği üret, sonuçları takip et.</p></div><div className="mt-12 grid gap-4 md:grid-cols-3">{steps.map(([number, title, text], index) => <div key={number} className="relative rounded-3xl border border-white/10 bg-black/20 p-6">{index < steps.length - 1 && <span className="absolute right-[-18px] top-14 z-10 hidden text-2xl text-violet-300 md:block">→</span>}<span className="text-4xl font-black text-violet-300/60">{number}</span><h3 className="mt-5 font-black text-white">{title}</h3><p className="mt-2 text-sm leading-6 text-zinc-500">{text}</p></div>)}</div></section>

      <section id="sonuc" className="mx-auto max-w-7xl py-14"><div className="overflow-hidden rounded-[32px] border border-violet-300/20 bg-gradient-to-br from-violet-500/20 via-[#10132b] to-cyan-500/10 px-6 py-12 text-center shadow-2xl shadow-violet-950/30 sm:px-12"><p className="text-xs font-black uppercase tracking-[.24em] text-violet-200">Bir sonraki adım belli olsun</p><h2 className="mx-auto mt-4 max-w-2xl text-3xl font-black tracking-tight text-white sm:text-5xl">Markan için daha az karmaşa, daha çok ivme.</h2><p className="mx-auto mt-5 max-w-xl text-sm leading-6 text-zinc-300">BrandFlow AI ile her gün ne paylaşacağını düşünmek yerine markanı büyütmeye odaklan.</p><Link href={startHref} className="mt-8 inline-flex rounded-2xl bg-white px-6 py-3.5 text-sm font-black text-violet-950 transition hover:bg-violet-50">Hemen başla <span className="ml-2">→</span></Link></div></section>

      <footer className="mx-auto flex max-w-7xl flex-col gap-3 border-t border-white/10 pt-7 text-xs text-zinc-600 sm:flex-row sm:items-center sm:justify-between"><span>© 2026 BrandFlow AI</span><div className="flex gap-5"><Link href="/sign-in" className="hover:text-zinc-300">Giriş yap</Link><Link href="/sign-up" className="hover:text-zinc-300">Hesap oluştur</Link></div></footer>
    </main>
  );
}
