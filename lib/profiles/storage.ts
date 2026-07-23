import { sanitizeProfileInput } from "@/lib/profiles/validation";
import type { ProfileInput, UserProfile } from "@/lib/profiles/types";

const storagePrefix = "brandflow:profiles";
const activePrefix = "brandflow:active-profile";

function now() {
  return new Date().toISOString();
}

function profilesKey(userId: string) {
  return `${storagePrefix}:${userId}`;
}

function activeKey(userId: string) {
  return `${activePrefix}:${userId}`;
}

function localId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function readRaw(userId: string) {
  if (typeof window === "undefined" || !userId) return [];

  try {
    const value = window.localStorage.getItem(profilesKey(userId));
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRaw(userId: string, profiles: UserProfile[]) {
  if (typeof window === "undefined" || !userId) return;
  window.localStorage.setItem(profilesKey(userId), JSON.stringify(profiles));
}

export function readLocalProfiles(userId: string) {
  return readRaw(userId).map((entry) => sanitizeStoredProfile(userId, entry));
}

export function saveLocalProfiles(userId: string, profiles: UserProfile[]) {
  writeRaw(userId, profiles);
}

export function readActiveProfileId(userId: string) {
  if (typeof window === "undefined" || !userId) return "";
  return window.localStorage.getItem(activeKey(userId)) || "";
}

export function writeActiveProfileId(userId: string, profileId: string) {
  if (typeof window === "undefined" || !userId) return;
  if (!profileId) {
    window.localStorage.removeItem(activeKey(userId));
    return;
  }
  window.localStorage.setItem(activeKey(userId), profileId);
}

export function createLocalProfile(userId: string, input: ProfileInput) {
  const cleaned = sanitizeProfileInput(input);
  const profiles = readLocalProfiles(userId);
  const createdAt = now();
  const shouldBeDefault = cleaned.is_default || profiles.length === 0;
  const nextProfiles = shouldBeDefault ? profiles.map((profile) => ({ ...profile, is_default: false })) : profiles;
  const profile: UserProfile = {
    id: localId(),
    clerk_user_id: userId,
    ...cleaned,
    is_default: shouldBeDefault,
    created_at: createdAt,
    updated_at: createdAt,
    last_used_at: null,
  };

  writeRaw(userId, [profile, ...nextProfiles]);
  if (profile.is_default) writeActiveProfileId(userId, profile.id);
  return profile;
}

export function updateLocalProfile(userId: string, profileId: string, input: Partial<ProfileInput>) {
  const profiles = readLocalProfiles(userId);
  const current = profiles.find((profile) => profile.id === profileId);
  if (!current) return null;

  const cleaned = sanitizeProfileInput({ ...current, ...input, profile_type: input.profile_type ?? current.profile_type });
  const updated: UserProfile = {
    ...current,
    ...cleaned,
    id: current.id,
    clerk_user_id: userId,
    updated_at: now(),
  };
  const nextProfiles = profiles.map((profile) => (profile.id === profileId ? updated : profile));
  writeRaw(userId, nextProfiles);
  return updated;
}

export function deleteLocalProfile(userId: string, profileId: string) {
  const profiles = readLocalProfiles(userId);
  const deleted = profiles.find((profile) => profile.id === profileId);
  const nextProfiles = profiles.filter((profile) => profile.id !== profileId);

  if (deleted?.is_default && nextProfiles[0]) {
    nextProfiles[0] = { ...nextProfiles[0], is_default: true, updated_at: now() };
    writeActiveProfileId(userId, nextProfiles[0].id);
  }

  if (readActiveProfileId(userId) === profileId) {
    writeActiveProfileId(userId, nextProfiles[0]?.id ?? "");
  }

  writeRaw(userId, nextProfiles);
}

export function setLocalDefaultProfile(userId: string, profileId: string) {
  const profiles = readLocalProfiles(userId);
  const nextProfiles = profiles.map((profile) => ({
    ...profile,
    is_default: profile.id === profileId,
    last_used_at: profile.id === profileId ? now() : profile.last_used_at,
    updated_at: profile.id === profileId ? now() : profile.updated_at,
  }));
  writeRaw(userId, nextProfiles);
  writeActiveProfileId(userId, profileId);
  return nextProfiles.find((profile) => profile.id === profileId) ?? null;
}

export function duplicateLocalProfile(userId: string, profileId: string) {
  const profiles = readLocalProfiles(userId);
  const source = profiles.find((profile) => profile.id === profileId);
  if (!source) return null;

  const createdAt = now();
  const duplicate: UserProfile = {
    ...source,
    id: localId(),
    profile_name: `${source.profile_name} kopya`,
    is_default: false,
    created_at: createdAt,
    updated_at: createdAt,
    last_used_at: null,
  };

  writeRaw(userId, [duplicate, ...profiles]);
  return duplicate;
}

function sanitizeStoredProfile(userId: string, entry: unknown): UserProfile {
  const raw = entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {};
  const input = sanitizeProfileInput(raw);
  const createdAt = typeof raw.created_at === "string" ? raw.created_at : now();

  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : localId(),
    clerk_user_id: userId,
    ...input,
    is_default: raw.is_default === true,
    created_at: createdAt,
    updated_at: typeof raw.updated_at === "string" ? raw.updated_at : createdAt,
    last_used_at: typeof raw.last_used_at === "string" ? raw.last_used_at : null,
  };
}
