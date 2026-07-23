"use client";

import {
  createLocalProfile,
  deleteLocalProfile,
  duplicateLocalProfile,
  readActiveProfileId,
  readLocalProfiles,
  setLocalDefaultProfile,
  updateLocalProfile,
  writeActiveProfileId,
} from "@/lib/profiles/storage";
import type { ProfileInput, UserProfile } from "@/lib/profiles/types";

type ApiProfileResponse = {
  storage?: "supabase" | "local";
  profiles?: UserProfile[];
  profile?: UserProfile | null;
  ok?: boolean;
};

async function jsonOrFallback(response: Response) {
  try {
    return (await response.json()) as ApiProfileResponse;
  } catch {
    return { storage: "local" as const };
  }
}

export async function loadProfiles(userId: string) {
  const response = await fetch("/api/profiles", { cache: "no-store" });
  const data = await jsonOrFallback(response);

  if (!response.ok || data.storage === "local") {
    return { storage: "local" as const, profiles: readLocalProfiles(userId) };
  }

  return { storage: "supabase" as const, profiles: data.profiles ?? [] };
}

export async function createProfile(userId: string, input: ProfileInput) {
  const response = await fetch("/api/profiles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await jsonOrFallback(response);

  if (!response.ok || data.storage === "local" || !data.profile) {
    return { storage: "local" as const, profile: createLocalProfile(userId, input) };
  }

  return { storage: "supabase" as const, profile: data.profile };
}

export async function updateProfile(userId: string, profileId: string, input: Partial<ProfileInput>) {
  const response = await fetch(`/api/profiles/${profileId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await jsonOrFallback(response);

  if (!response.ok || data.storage === "local" || !data.profile) {
    return { storage: "local" as const, profile: updateLocalProfile(userId, profileId, input) };
  }

  return { storage: "supabase" as const, profile: data.profile };
}

export async function deleteProfile(userId: string, profileId: string) {
  const response = await fetch(`/api/profiles/${profileId}`, { method: "DELETE" });
  const data = await jsonOrFallback(response);

  if (!response.ok || data.storage === "local" || !data.ok) {
    deleteLocalProfile(userId, profileId);
    return { storage: "local" as const, ok: true };
  }

  return { storage: "supabase" as const, ok: true };
}

export async function setDefaultProfile(userId: string, profileId: string) {
  const response = await fetch(`/api/profiles/${profileId}/default`, { method: "POST" });
  const data = await jsonOrFallback(response);

  if (!response.ok || data.storage === "local" || !data.profile) {
    return { storage: "local" as const, profile: setLocalDefaultProfile(userId, profileId) };
  }

  writeActiveProfileId(userId, data.profile.id);
  return { storage: "supabase" as const, profile: data.profile };
}

export async function duplicateProfile(userId: string, profileId: string) {
  const response = await fetch(`/api/profiles/${profileId}/duplicate`, { method: "POST" });
  const data = await jsonOrFallback(response);

  if (!response.ok || data.storage === "local" || !data.profile) {
    return { storage: "local" as const, profile: duplicateLocalProfile(userId, profileId) };
  }

  return { storage: "supabase" as const, profile: data.profile };
}

export function activeProfileId(userId: string) {
  return readActiveProfileId(userId);
}

export function setActiveProfileId(userId: string, profileId: string) {
  writeActiveProfileId(userId, profileId);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("brandflow:active-profile-change", { detail: { userId, profileId } }));
  }
}
