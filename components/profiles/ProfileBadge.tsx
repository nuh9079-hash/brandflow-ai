import { profileTypeLabels, type ProfileType } from "@/lib/profiles/types";

const colors: Record<ProfileType, string> = {
  business: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  personal: "border-sky-400/30 bg-sky-400/10 text-sky-200",
  creator: "border-fuchsia-400/30 bg-fuchsia-400/10 text-fuchsia-200",
};

export function ProfileBadge({ type }: { type: ProfileType }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${colors[type]}`}>
      {profileTypeLabels[type]}
    </span>
  );
}
