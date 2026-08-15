"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const HIDDEN_KEY = "brandflow-assistant-hidden";

export function ExecutiveAssistant() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [notice, setNotice] = useState(true);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setHidden(localStorage.getItem(HIDDEN_KEY) === "1");
  }, []);

  if (pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up")) return null;

  function startHold() {
    holdTimer.current = setTimeout(() => {
      localStorage.setItem(HIDDEN_KEY, "1");
      setHidden(true);
      setOpen(false);
    }, 850);
  }

  function stopHold() {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = null;
  }

  if (hidden) {
    return (
      <button
        type="button"
        onClick={() => {
          localStorage.removeItem(HIDDEN_KEY);
          setHidden(false);
        }}
        className="fixed bottom-4 right-4 z-[80] rounded-full border border-violet-400/30 bg-[#090a14]/90 px-3 py-2 text-xs font-bold text-violet-200 shadow-2xl backdrop-blur-xl"
      >
        AI Asistanı Göster
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-[80] flex items-end gap-3">
      {(open || notice) && (
        <div className="mb-3 w-[310px] overflow-hidden rounded-2xl border border-violet-400/20 bg-[#080914]/92 shadow-[0_24px_80px_rgba(30,10,70,.48)] backdrop-blur-2xl">
          <div className="border-b border-white/10 bg-gradient-to-r from-violet-600/18 to-indigo-500/5 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[.18em] text-violet-300">BrandFlow AI</p>
                <p className="mt-1 text-sm font-bold text-white">İş ortağın hazır.</p>
              </div>
              <button onClick={() => { setNotice(false); setOpen(false); }} className="text-zinc-500 transition hover:text-white" aria-label="Kapat">×</button>
            </div>
          </div>
          <div className="space-y-3 p-4">
            <p className="text-sm leading-6 text-zinc-300">Profilini, içerik akışını ve fırsatlarını birlikte değerlendirip sana uygulanabilir bir sonraki adımı gösterebilirim.</p>
            <div className="grid gap-2">
              <Link href="/company-doctor" className="rounded-xl border border-white/10 bg-white/[.04] px-3 py-2 text-sm font-semibold text-white transition hover:border-violet-400/35 hover:bg-violet-500/10">Şirketimi analiz et</Link>
              <Link href="/opportunities" className="rounded-xl border border-white/10 bg-white/[.04] px-3 py-2 text-sm font-semibold text-white transition hover:border-violet-400/35 hover:bg-violet-500/10">Yeni fırsatları göster</Link>
              <Link href="/create" className="rounded-xl border border-white/10 bg-white/[.04] px-3 py-2 text-sm font-semibold text-white transition hover:border-violet-400/35 hover:bg-violet-500/10">Bugün ne paylaşmalıyım?</Link>
            </div>
            <p className="text-[11px] text-zinc-500">İpucu: Asistanı 1 saniye basılı tutarak gizleyebilirsin.</p>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => { setOpen((value) => !value); setNotice(false); }}
        onPointerDown={startHold}
        onPointerUp={stopHold}
        onPointerLeave={stopHold}
        onPointerCancel={stopHold}
        className="group relative h-[82px] w-[68px] select-none rounded-[24px] border border-violet-400/25 bg-gradient-to-b from-[#17182a]/95 to-[#070810]/95 shadow-[0_18px_60px_rgba(90,45,190,.35)] backdrop-blur-xl transition hover:-translate-y-1 hover:border-violet-300/45"
        aria-label="BrandFlow AI Asistan"
      >
        <span className="absolute left-1/2 top-[9px] h-[29px] w-[29px] -translate-x-1/2 rounded-[42%_42%_46%_46%] border border-violet-300/35 bg-gradient-to-br from-zinc-200 via-zinc-400 to-zinc-700 shadow-[inset_-4px_-5px_8px_rgba(0,0,0,.35)]" />
        <span className="absolute left-[24px] top-[21px] h-[4px] w-[4px] rounded-full bg-violet-300 shadow-[0_0_9px_#c4b5fd]" />
        <span className="absolute right-[24px] top-[21px] h-[4px] w-[4px] rounded-full bg-violet-300 shadow-[0_0_9px_#c4b5fd]" />
        <span className="absolute bottom-[9px] left-1/2 h-[35px] w-[45px] -translate-x-1/2 rounded-[10px_10px_15px_15px] bg-gradient-to-br from-[#151729] to-[#05060b] shadow-[inset_0_0_0_1px_rgba(255,255,255,.08)]" />
        <span className="absolute bottom-[10px] left-1/2 h-[29px] w-[2px] -translate-x-1/2 bg-violet-500/70" />
        <span className="absolute bottom-[27px] left-1/2 h-0 w-0 -translate-x-1/2 border-l-[5px] border-r-[5px] border-t-[9px] border-l-transparent border-r-transparent border-t-violet-500" />
        <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_12px_#34d399]" />
      </button>
    </div>
  );
}
