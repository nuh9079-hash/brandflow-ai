"use client";

import {
  createEmptyProfileInput,
  profileTypeDescriptions,
  profileTypeLabels,
  type ProfileType,
} from "@/lib/profiles/types";

const profileTypes: ProfileType[] = ["business", "personal", "creator"];

type ProfileTypeSelectorProps = {
  value: ProfileType;
  onChange: (value: ProfileType) => void;
};

export function ProfileTypeSelector({ value, onChange }: ProfileTypeSelectorProps) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {profileTypes.map((type) => {
        const selected = value === type;

        return (
          <button
            key={type}
            type="button"
            onClick={() => onChange(type)}
            className={`rounded-lg border p-4 text-left transition ${
              selected ? "border-emerald-400/50 bg-emerald-400/10" : "border-white/10 bg-white/[0.03] hover:bg-white/5"
            }`}
          >
            <span className="block text-sm font-black text-white">{profileTypeLabels[type]}</span>
            <span className="mt-1 block text-sm leading-5 text-zinc-500">{profileTypeDescriptions[type]}</span>
            <span className="sr-only">{createEmptyProfileInput(type).profile_name}</span>
          </button>
        );
      })}
    </div>
  );
}
