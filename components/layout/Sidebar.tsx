"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ProfileSwitcher } from "@/components/profiles/ProfileSwitcher";
import { NotificationBell } from "@/components/notifications/NotificationBell";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/create", label: "Create" },
  { href: "/history", label: "History" },
  { href: "/favorites", label: "Favorites" },
  { href: "/publish", label: "Paylaşım Merkezi" },
  { href: "/drafts", label: "Taslaklar" },
  { href: "/queue", label: "Planlananlar" },
  { href: "/connections", label: "Bağlantılar" },
  { href: "/calendar", label: "Calendar" },
  { href: "/profiles", label: "Profiller" },
  { href: "/media", label: "Medya Merkezi" },
  { href: "/image-studio", label: "AI Image Studio" },
  { href: "/video-studio", label: "AI Video Studio" },
  { href: "/marketing-advisor", label: "AI Marketing Advisor" },
  { href: "/analytics", label: "Analytics" },
  { href: "/team", label: "Team" },
  { href: "/settings", label: "Settings" },
  { href: "/billing", label: "Billing" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [menuState, setMenuState] = useState({ open: false, pathname });
  const open = menuState.open && menuState.pathname === pathname;

  useEffect(() => {
    if (!open) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuState({ open: false, pathname });
    };

    document.addEventListener("keydown", closeOnEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = "";
    };
  }, [open, pathname]);

  const close = () => setMenuState({ open: false, pathname });

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center border-b border-white/10 bg-[#09090b]/95 px-4 backdrop-blur sm:px-6">
        <button
          type="button"
          aria-label={open ? "Menüyü kapat" : "Menüyü aç"}
          aria-expanded={open}
          aria-controls="brandflow-navigation"
          onClick={() => setMenuState({ open: !open, pathname })}
          className="grid h-10 w-10 place-items-center rounded-md border border-white/10 text-zinc-200 transition hover:border-white/25 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
        >
          <span className="flex w-5 flex-col gap-1.5" aria-hidden="true">
            <span className="h-0.5 w-full bg-current" />
            <span className="h-0.5 w-full bg-current" />
            <span className="h-0.5 w-full bg-current" />
          </span>
        </button>
        <Link href="/" onClick={close} className="ml-3 flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-emerald-400 text-xs font-black text-zinc-950">BF</span>
          <span className="font-semibold text-white">BrandFlow AI</span>
        </Link>
        <div className="ml-auto">
          <NotificationBell />
        </div>
      </header>

      <button
        type="button"
        aria-label="Menüyü kapat"
        onClick={close}
        className={`fixed inset-0 z-40 bg-black/65 transition-opacity duration-200 ${open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
      />

      <aside
        id="brandflow-navigation"
        aria-hidden={!open}
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(20rem,calc(100vw-2rem))] flex-col border-r border-white/10 bg-[#111113] shadow-2xl transition-transform duration-200 ease-out ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
          <Link href="/" onClick={close} className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-emerald-400 text-xs font-black text-zinc-950">BF</span>
            <span className="font-semibold text-white">BrandFlow AI</span>
          </Link>
          <button type="button" onClick={close} aria-label="Menüyü kapat" className="grid h-9 w-9 place-items-center rounded-md text-2xl leading-none text-zinc-400 hover:bg-white/5 hover:text-white">
            ×
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-4">
          {navItems.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={close}
                aria-current={active ? "page" : undefined}
                className={`block rounded-md px-3 py-2.5 text-sm font-semibold transition ${active ? "bg-white text-zinc-950" : "text-zinc-400 hover:bg-white/5 hover:text-white"}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <ProfileSwitcher compact />
        </div>
      </aside>
    </>
  );
}
