"use client";

import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Button, Card, EmptyState, Modal } from "@/components/ui";
import { ProfileCard } from "@/components/profiles/ProfileCard";
import { ProfileDeleteModal } from "@/components/profiles/ProfileDeleteModal";
import { ProfileForm } from "@/components/profiles/ProfileForm";
import {
  activeProfileId,
  createProfile,
  deleteProfile,
  duplicateProfile,
  loadProfiles,
  setActiveProfileId,
  setDefaultProfile,
  updateProfile,
} from "@/lib/profiles/client";
import { createEmptyProfileInput, profileTypeLabels, type ProfileInput, type UserProfile } from "@/lib/profiles/types";
import { profileInputError } from "@/lib/profiles/validation";

type ProfilesClientProps = {
  initialProfiles: UserProfile[];
  initialStorage: "supabase" | "local";
};

export function ProfilesClient({ initialProfiles, initialStorage }: ProfilesClientProps) {
  const { user } = useUser();
  const [profiles, setProfiles] = useState(initialProfiles);
  const [storage, setStorage] = useState(initialStorage);
  const [activeId, setActiveId] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<UserProfile | null>(null);
  const [deleting, setDeleting] = useState<UserProfile | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user?.id) return;

    const timer = window.setTimeout(() => {
      loadProfiles(user.id)
        .then(({ storage: nextStorage, profiles: nextProfiles }) => {
          const storedActiveId = activeProfileId(user.id);
          const defaultProfile = nextProfiles.find((profile) => profile.is_default) ?? nextProfiles[0] ?? null;
          const nextActiveId = nextProfiles.some((profile) => profile.id === storedActiveId)
            ? storedActiveId
            : defaultProfile?.id ?? "";

          setProfiles(nextProfiles);
          setStorage(nextStorage);
          setActiveId(nextActiveId);
          if (nextActiveId) setActiveProfileId(user.id, nextActiveId);
        })
        .catch(() => setStorage("local"));
    }, 0);

    return () => window.clearTimeout(timer);
  }, [user?.id]);

  const stats = useMemo(() => {
    const defaultProfile = profiles.find((profile) => profile.is_default);
    const activeProfile = profiles.find((profile) => profile.id === activeId);

    return {
      total: profiles.length,
      defaultName: defaultProfile?.profile_name ?? "Yok",
      activeName: activeProfile?.profile_name ?? "Seçilmedi",
      types: Array.from(new Set(profiles.map((profile) => profile.profile_type)))
        .map((type) => profileTypeLabels[type])
        .join(", ") || "Yok",
    };
  }, [activeId, profiles]);

  function validate(input: ProfileInput) {
    const message = profileInputError(input);
    setError(message);
    return !message;
  }

  async function handleCreate(input: ProfileInput) {
    if (!user?.id || !validate(input)) return;

    const { storage: nextStorage, profile } = await createProfile(user.id, input);
    if (!profile) {
      setError("Profil kaydedilemedi. Lütfen tekrar dene.");
      return;
    }

    setStorage(nextStorage);
    setProfiles((current) => (profile.is_default ? [profile, ...current.map((item) => ({ ...item, is_default: false }))] : [profile, ...current]));
    setActiveId(profile.id);
    setActiveProfileId(user.id, profile.id);
    setCreateOpen(false);
    setError("");
  }

  async function handleUpdate(input: ProfileInput) {
    if (!user?.id || !editing || !validate(input)) return;

    const { storage: nextStorage, profile } = await updateProfile(user.id, editing.id, input);
    if (!profile) {
      setError("Profil güncellenemedi. Lütfen tekrar dene.");
      return;
    }

    setStorage(nextStorage);
    setProfiles((current) =>
      current.map((item) =>
        item.id === profile.id
          ? profile
          : profile.is_default
            ? { ...item, is_default: false }
            : item
      )
    );
    setEditing(null);
    setError("");
  }

  async function handleDefault(profile: UserProfile) {
    if (!user?.id) return;

    const { storage: nextStorage, profile: nextProfile } = await setDefaultProfile(user.id, profile.id);
    setStorage(nextStorage);
    setActiveId(profile.id);
    setActiveProfileId(user.id, profile.id);
    setProfiles((current) =>
      current.map((item) => ({
        ...item,
        is_default: item.id === profile.id,
        last_used_at: item.id === profile.id ? new Date().toISOString() : item.last_used_at,
      }))
    );

    if (nextProfile) {
      setProfiles((current) => current.map((item) => (item.id === nextProfile.id ? nextProfile : item)));
    }
  }

  async function handleDuplicate(profile: UserProfile) {
    if (!user?.id) return;

    const { storage: nextStorage, profile: duplicate } = await duplicateProfile(user.id, profile.id);
    if (!duplicate) {
      setError("Profil kopyalanamadı. Lütfen tekrar dene.");
      return;
    }

    setStorage(nextStorage);
    setProfiles((current) => [duplicate, ...current]);
    setError("");
  }

  async function handleDelete(profile: UserProfile) {
    if (!user?.id) return;

    await deleteProfile(user.id, profile.id);
    const nextProfiles = profiles.filter((item) => item.id !== profile.id);
    const nextActiveProfile = nextProfiles[0] ?? null;

    if ((activeId === profile.id || profile.is_default) && nextActiveProfile) {
      const { storage: nextStorage, profile: defaultProfile } = await setDefaultProfile(user.id, nextActiveProfile.id);
      setStorage(nextStorage);
      setActiveId(nextActiveProfile.id);
      setActiveProfileId(user.id, nextActiveProfile.id);
      setProfiles(
        nextProfiles.map((item) => ({
          ...item,
          is_default: item.id === nextActiveProfile.id,
          ...(defaultProfile?.id === item.id ? defaultProfile : {}),
        }))
      );
    } else {
      setProfiles(nextProfiles);
      if (activeId === profile.id) {
        setActiveId("");
        setActiveProfileId(user.id, "");
      }
    }
    setDeleting(null);
  }

  function useProfile(profile: UserProfile) {
    if (!user?.id) return;

    setActiveId(profile.id);
    setActiveProfileId(user.id, profile.id);
  }

  return (
    <div className="space-y-5">
      {storage === "local" && (
        <Card className="border-amber-400/30 bg-amber-400/5 p-4">
          <p className="text-sm leading-6 text-amber-100">
            Supabase yapılandırılmadığı için profiller bu tarayıcıda saklanıyor. Supabase migration çalışınca aynı ekran veritabanı ile çalışır.
          </p>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Toplam profil</p>
          <p className="mt-2 text-2xl font-black text-white">{stats.total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Varsayılan</p>
          <p className="mt-2 truncate text-lg font-black text-white">{stats.defaultName}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Aktif profil</p>
          <p className="mt-2 truncate text-lg font-black text-white">{stats.activeName}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Profil türleri</p>
          <p className="mt-2 truncate text-lg font-black text-white">{stats.types}</p>
        </Card>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-black text-white">Profiller</h2>
          <p className="mt-1 text-sm leading-6 text-zinc-400">Her kullanım tarzı için ayrı profil oluştur, tek tıkla üretim formuna uygula.</p>
        </div>
        <Button type="button" onClick={() => setCreateOpen(true)}>Yeni profil</Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {profiles.length === 0 ? (
        <EmptyState title="Henüz profil yok" description="İlk profilini oluşturunca form alanları otomatik dolmaya başlar." />
      ) : (
        <div className="grid gap-4">
          {profiles.map((profile) => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              active={activeId === profile.id}
              onUse={useProfile}
              onEdit={setEditing}
              onDuplicate={handleDuplicate}
              onDefault={handleDefault}
              onDelete={setDeleting}
            />
          ))}
        </div>
      )}

      <Modal title="Yeni profil" open={createOpen} onClose={() => setCreateOpen(false)}>
        <ProfileForm
          key={createOpen ? "create-open" : "create-closed"}
          initialProfile={createEmptyProfileInput()}
          submitLabel="Profili kaydet"
          onCancel={() => setCreateOpen(false)}
          onSubmit={handleCreate}
        />
      </Modal>

      <Modal title="Profili düzenle" open={Boolean(editing)} onClose={() => setEditing(null)}>
        <ProfileForm
          key={editing?.id ?? "editing-empty"}
          initialProfile={editing}
          submitLabel="Değişiklikleri kaydet"
          onCancel={() => setEditing(null)}
          onSubmit={handleUpdate}
        />
      </Modal>

      <ProfileDeleteModal profile={deleting} onClose={() => setDeleting(null)} onConfirm={handleDelete} />
    </div>
  );
}
