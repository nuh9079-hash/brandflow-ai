import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { ProfileInput, UserProfile } from "@/lib/profiles/types";
import { normalizeProfile, sanitizeProfileInput } from "@/lib/profiles/validation";

const tableName = "user_profiles";

function withoutClientOnlyFields(input: ProfileInput) {
  return {
    profile_name: input.profile_name,
    profile_type: input.profile_type,
    is_default: input.is_default,
    business_name: input.business_name || null,
    product_or_service: input.product_or_service || null,
    description: input.description || null,
    brand_tone: input.brand_tone || null,
    target_audience: input.target_audience || null,
    price_range: input.price_range || null,
    campaign_info: input.campaign_info || null,
    competitor: input.competitor || null,
    website: input.website || null,
    brand_colors: input.brand_colors || null,
    default_platforms: input.default_platforms,
    language: input.language || null,
    content_goal: input.content_goal || null,
    display_name: input.display_name || null,
    photo_style: input.photo_style || null,
    personal_mood: input.personal_mood || null,
    content_style: input.content_style || null,
    interests: input.interests,
    humor_level: input.humor_level || null,
    personal_platforms: input.personal_platforms,
    personal_language: input.personal_language || null,
    personal_notes: input.personal_notes || null,
    creator_name: input.creator_name || null,
    main_topic: input.main_topic || null,
    sub_topics: input.sub_topics,
    creator_audience: input.creator_audience || null,
    video_duration: input.video_duration || null,
    creator_tone: input.creator_tone || null,
    hook_style: input.hook_style || null,
    cta_style: input.cta_style || null,
    thumbnail_style: input.thumbnail_style || null,
    creator_platforms: input.creator_platforms,
    creator_language: input.creator_language || null,
    required_words: input.required_words,
    blocked_words: input.blocked_words,
    blocked_topics: input.blocked_topics,
  };
}

export async function listUserProfiles(userId: string) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { storage: "local" as const, profiles: [] as UserProfile[] };

  const { data, error } = await supabase
    .from(tableName)
    .select("*")
    .eq("clerk_user_id", userId)
    .order("is_default", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Supabase profiles list failed", error.message);
    return { storage: "local" as const, profiles: [] as UserProfile[] };
  }

  return {
    storage: "supabase" as const,
    profiles: (data ?? []).map((row) => normalizeProfile(row as Record<string, unknown>)),
  };
}

export async function getUserProfile(userId: string, profileId: string) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { storage: "local" as const, profile: null };

  const { data, error } = await supabase
    .from(tableName)
    .select("*")
    .eq("clerk_user_id", userId)
    .eq("id", profileId)
    .maybeSingle();

  if (error) {
    console.error("Supabase profile get failed", error.message);
    return { storage: "local" as const, profile: null };
  }

  return {
    storage: "supabase" as const,
    profile: data ? normalizeProfile(data as Record<string, unknown>) : null,
  };
}

export async function createUserProfile(userId: string, inputValue: unknown) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { storage: "local" as const, profile: null };

  const input = sanitizeProfileInput(inputValue);
  const { count } = await supabase
    .from(tableName)
    .select("id", { count: "exact", head: true })
    .eq("clerk_user_id", userId);
  const shouldBeDefault = input.is_default || (count ?? 0) === 0;
  const record = { ...input, is_default: shouldBeDefault };

  if (shouldBeDefault) {
    await supabase.from(tableName).update({ is_default: false }).eq("clerk_user_id", userId);
  }

  const { data, error } = await supabase
    .from(tableName)
    .insert({ ...withoutClientOnlyFields(record), clerk_user_id: userId })
    .select("*")
    .single();

  if (error) {
    console.error("Supabase profile create failed", error.message);
    return { storage: "local" as const, profile: null };
  }

  return {
    storage: "supabase" as const,
    profile: normalizeProfile(data as Record<string, unknown>),
  };
}

export async function updateUserProfile(userId: string, profileId: string, inputValue: unknown) {
  const existing = await getUserProfile(userId, profileId);
  if (existing.storage === "local" || !existing.profile) {
    return { storage: existing.storage, profile: null };
  }

  const input = sanitizeProfileInput({ ...existing.profile, ...(inputValue as Record<string, unknown>) });
  const supabase = getSupabaseServerClient();

  if (!supabase) return { storage: "local" as const, profile: null };

  if (input.is_default) {
    await supabase.from(tableName).update({ is_default: false }).eq("clerk_user_id", userId).neq("id", profileId);
  }

  const { data, error } = await supabase
    .from(tableName)
    .update({ ...withoutClientOnlyFields(input), updated_at: new Date().toISOString() })
    .eq("clerk_user_id", userId)
    .eq("id", profileId)
    .select("*")
    .single();

  if (error) {
    console.error("Supabase profile update failed", error.message);
    return { storage: "local" as const, profile: null };
  }

  return {
    storage: "supabase" as const,
    profile: normalizeProfile(data as Record<string, unknown>),
  };
}

export async function deleteUserProfile(userId: string, profileId: string) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { storage: "local" as const, ok: false };

  const existing = await getUserProfile(userId, profileId);
  const { error } = await supabase.from(tableName).delete().eq("clerk_user_id", userId).eq("id", profileId);

  if (error) {
    console.error("Supabase profile delete failed", error.message);
    return { storage: "local" as const, ok: false };
  }

  if (existing.profile?.is_default) {
    const { data } = await supabase
      .from(tableName)
      .select("id")
      .eq("clerk_user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextId = typeof data?.id === "string" ? data.id : "";
    if (nextId) {
      await setDefaultUserProfile(userId, nextId);
    }
  }

  return { storage: "supabase" as const, ok: true };
}

export async function setDefaultUserProfile(userId: string, profileId: string) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { storage: "local" as const, profile: null };

  await supabase.from(tableName).update({ is_default: false }).eq("clerk_user_id", userId);

  const { data, error } = await supabase
    .from(tableName)
    .update({
      is_default: true,
      last_used_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("clerk_user_id", userId)
    .eq("id", profileId)
    .select("*")
    .single();

  if (error) {
    console.error("Supabase profile default failed", error.message);
    return { storage: "local" as const, profile: null };
  }

  return {
    storage: "supabase" as const,
    profile: normalizeProfile(data as Record<string, unknown>),
  };
}

export async function duplicateUserProfile(userId: string, profileId: string) {
  const existing = await getUserProfile(userId, profileId);
  if (existing.storage === "local" || !existing.profile) {
    return { storage: existing.storage, profile: null };
  }

  const source = existing.profile;
  return createUserProfile(userId, {
    ...source,
    profile_name: `${source.profile_name} kopya`,
    is_default: false,
  });
}

export async function getDefaultUserProfile(userId: string) {
  const { storage, profiles } = await listUserProfiles(userId);

  return {
    storage,
    profile: profiles.find((profile) => profile.is_default) ?? profiles[0] ?? null,
  };
}
