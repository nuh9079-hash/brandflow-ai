import type { ReactNode } from "react";
import { UserButton } from "@clerk/nextjs";
import { ProfileSwitcher } from "@/components/profiles/ProfileSwitcher";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export function Navbar({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <header className="flex flex-col gap-4 border-b border-white/10 pb-6 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <p className="text-sm font-medium text-emerald-300">BrandFlow AI</p>
        <h2 className="mt-2 text-3xl font-bold tracking-normal text-white sm:text-4xl">{title}</h2>
        {children}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <ProfileSwitcher />
        <ThemeToggle />
        <div className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/5">
          <UserButton />
        </div>
      </div>
    </header>
  );
}
