"use client";

import { Button, Modal } from "@/components/ui";
import type { UserProfile } from "@/lib/profiles/types";

type ProfileDeleteModalProps = {
  profile: UserProfile | null;
  onClose: () => void;
  onConfirm: (profile: UserProfile) => void;
};

export function ProfileDeleteModal({ profile, onClose, onConfirm }: ProfileDeleteModalProps) {
  return (
    <Modal title="Profili sil" open={Boolean(profile)} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm leading-6 text-zinc-300">
          {profile ? `${profile.profile_name} profilini silmek üzeresin. Bu işlem sadece bu profili kaldırır; geçmiş içeriklere dokunmaz.` : ""}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>Vazgeç</Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              if (profile) onConfirm(profile);
            }}
          >
            Sil
          </Button>
        </div>
      </div>
    </Modal>
  );
}
