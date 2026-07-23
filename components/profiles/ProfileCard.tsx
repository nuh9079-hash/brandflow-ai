"use client";

import { Button, Card } from "@/components/ui";
import { ProfileBadge } from "@/components/profiles/ProfileBadge";
import { profilePlatformLabels, type UserProfile } from "@/lib/profiles/types";

type ProfileCardProps = {
  profile: UserProfile;
  active?: boolean;
  onUse: (profile: UserProfile) => void;
  onEdit: (profile: UserProfile) => void;
  onDuplicate: (profile: UserProfile) => void;
  onDefault: (profile: UserProfile) => void;
  onDelete: (profile: UserProfile) => void;
};

function summary(profile: UserProfile) {
  if (profile.profile_type === "personal") {
    return profile.content_style || profile.personal_mood || "Kişisel paylaşım profili";
  }

  if (profile.profile_type === "creator") {
    return profile.main_topic || profile.creator_tone || "İçerik üretici profili";
  }

  return profile.product_or_service || profile.business_name || "İşletme profili";
}

function platforms(profile: UserProfile) {
  const values =
    profile.profile_type === "personal"
      ? profile.personal_platforms
      : profile.profile_type === "creator"
        ? profile.creator_platforms
        : profile.default_platforms;

  return values
    .slice(0, 4)
    .map((platform) => profilePlatformLabels[platform])
    .join(", ");
}

export function ProfileCard({ profile, active, onUse, onEdit, onDuplicate, onDefault, onDelete }: ProfileCardProps) {
  return (
    <Card className={`p-5 ${active ? "border-emerald-400/40" : ""}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <ProfileBadge type={profile.profile_type} />
            {profile.is_default && (
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-bold text-zinc-200">
                Varsayılan
              </span>
            )}
            {active && (
              <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-xs font-bold text-emerald-200">
                Aktif
              </span>
            )}
          </div>
          <h3 className="mt-4 text-lg font-black text-white">{profile.profile_name}</h3>
          <p className="mt-1 text-sm leading-6 text-zinc-400">{summary(profile)}</p>
          <p className="mt-3 text-xs text-zinc-500">{platforms(profile) || "Platform seçimi yok"}</p>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <Button type="button" variant="secondary" onClick={() => onUse(profile)}>Kullan</Button>
          <Button type="button" variant="secondary" onClick={() => onEdit(profile)}>Düzenle</Button>
          <Button type="button" variant="secondary" onClick={() => onDuplicate(profile)}>Kopyala</Button>
          <Button type="button" variant="secondary" onClick={() => onDefault(profile)} disabled={profile.is_default}>
            Varsayılan
          </Button>
          <Button type="button" variant="ghost" onClick={() => onDelete(profile)}>Sil</Button>
        </div>
      </div>
    </Card>
  );
}
