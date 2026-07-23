"use client";

import Link from "next/link";
import { Button, Card } from "@/components/ui";

type ProfileOnboardingProps = {
  onSkip: () => void;
};

export function ProfileOnboarding({ onSkip }: ProfileOnboardingProps) {
  return (
    <Card className="border-emerald-400/30 bg-emerald-400/5 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-black text-emerald-200">Profil sistemi hazır</p>
          <h2 className="mt-2 text-xl font-black text-white">Bilgilerini bir kez kaydet, her üretimde otomatik dolsun.</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
            İşletme, kişisel paylaşım veya içerik üretici profili oluşturabilirsin. İstersen şimdilik profilsiz devam edebilirsin.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link href="/profiles">
            <Button type="button" className="w-full sm:w-auto">Profil oluştur</Button>
          </Link>
          <Button type="button" variant="secondary" onClick={onSkip}>Şimdilik atla</Button>
        </div>
      </div>
    </Card>
  );
}
