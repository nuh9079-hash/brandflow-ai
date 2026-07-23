"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { activeProfileId, loadProfiles, setActiveProfileId } from "@/lib/profiles/client";
import { profileTypeLabels, type UserProfile } from "@/lib/profiles/types";

type ProfileSwitcherProps = {
  compact?: boolean;
};

export function ProfileSwitcher({ compact = false }: ProfileSwitcherProps) {
  const { user } = useUser();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [activeId, setActiveId] = useState("");

  useEffect(() => {
    if (!user?.id) return;

    const timer = window.setTimeout(() => {
      loadProfiles(user.id)
        .then(({ profiles: nextProfiles }) => {
          const storedActiveId = activeProfileId(user.id);
          const defaultProfile = nextProfiles.find((profile) => profile.is_default) ?? nextProfiles[0];
          const nextActiveId = nextProfiles.some((profile) => profile.id === storedActiveId)
            ? storedActiveId
            : defaultProfile?.id ?? "";

          setProfiles(nextProfiles);
          setActiveId(nextActiveId);
          if (nextActiveId) setActiveProfileId(user.id, nextActiveId);
        })
        .catch(() => {
          setProfiles([]);
          setActiveId("");
        });
    }, 0);

    return () => window.clearTimeout(timer);
  }, [user?.id]);

  const activeProfile = useMemo(
    () => profiles.find((profile) => profile.id === activeId) ?? null,
    [activeId, profiles]
  );

  if (!user?.id) return null;

  return (
    <div className={compact ? "w-full" : "min-w-52"}>
      {profiles.length > 0 ? (
        <label className="block text-xs font-bold text-zinc-400">
          Aktif profil
          <select
            value={activeId}
            onChange={(event) => {
              setActiveId(event.target.value);
              setActiveProfileId(user.id, event.target.value);
            }}
            className="mt-2 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm font-semibold text-zinc-100 outline-none transition focus:border-emerald-300"
          >
            {profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.profile_name}
              </option>
            ))}
          </select>
          {activeProfile && (
            <span className="mt-1 block text-xs font-medium text-zinc-500">
              {profileTypeLabels[activeProfile.profile_type]}
            </span>
          )}
        </label>
      ) : (
        <Link
          href="/profiles"
          className="inline-flex w-full items-center justify-center rounded-lg border border-white/10 px-3 py-2 text-sm font-bold text-zinc-200 transition hover:bg-white/5"
        >
          Profil oluştur
        </Link>
      )}
    </div>
  );
}
