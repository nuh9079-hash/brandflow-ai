import { getSupabaseServerClient } from "@/lib/supabase/server";

export type GeneratedContentRecord = {
  id: string;
  user_id: string;
  product: string;
  tone: string;
  content: string;
  sections: Record<string, string> | null;
  is_favorite: boolean;
  created_at: string;
};

export type ProfileSettings = {
  user_id: string;
  name: string | null;
  brand_name: string | null;
  brand_colors: string | null;
  target_audience: string | null;
  default_language: string | null;
  writing_style: string | null;
};

export async function ensureProfile(userId: string) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("profiles")
    .upsert({ user_id: userId, updated_at: new Date().toISOString() }, { onConflict: "user_id" })
    .select("*")
    .single();

  if (error) {
    console.error("Supabase profile upsert failed", error);
    return null;
  }

  return data as ProfileSettings;
}

export async function saveGeneratedContent(input: {
  userId: string;
  product: string;
  tone: string;
  content: string;
  sections?: Record<string, string> | null;
}) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  await ensureProfile(input.userId);

  const { data, error } = await supabase
    .from("generated_contents")
    .insert({
      user_id: input.userId,
      product: input.product,
      tone: input.tone,
      content: input.content,
      sections: input.sections ?? null,
    })
    .select("*")
    .single();

  if (error) {
    console.error("Supabase generated content insert failed", error);
    return null;
  }

  await supabase.from("history").insert({
    user_id: input.userId,
    content_id: data.id,
    action: "generated",
    metadata: { product: input.product, tone: input.tone },
  });

  return data as GeneratedContentRecord;
}

export async function listGeneratedContents(userId: string, options?: { favoritesOnly?: boolean; limit?: number }) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [] as GeneratedContentRecord[];

  let query = supabase
    .from("generated_contents")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(options?.limit ?? 100);

  if (options?.favoritesOnly) {
    query = query.eq("is_favorite", true);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Supabase content list failed", error);
    return [] as GeneratedContentRecord[];
  }

  return (data ?? []) as GeneratedContentRecord[];
}

export async function getDashboardStats(userId: string) {
  const items = await listGeneratedContents(userId, { limit: 500 });
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  return {
    totalContents: items.length,
    thisWeek: items.filter((item) => new Date(item.created_at).getTime() >= weekAgo).length,
    favorites: items.filter((item) => item.is_favorite).length,
    aiCredits: 120,
  };
}

export async function deleteGeneratedContent(userId: string, contentId: string) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { ok: true };

  await supabase.from("favorites").delete().eq("user_id", userId).eq("content_id", contentId);
  await supabase.from("history").delete().eq("user_id", userId).eq("content_id", contentId);
  const { error } = await supabase.from("generated_contents").delete().eq("user_id", userId).eq("id", contentId);

  if (error) {
    console.error("Supabase delete failed", error);
    return { ok: false };
  }

  return { ok: true };
}

export async function setFavorite(userId: string, contentId: string, favorite: boolean) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { ok: true };

  const { error } = await supabase
    .from("generated_contents")
    .update({ is_favorite: favorite })
    .eq("user_id", userId)
    .eq("id", contentId);

  if (favorite) {
    await supabase.from("favorites").upsert({ user_id: userId, content_id: contentId }, { onConflict: "user_id,content_id" });
  } else {
    await supabase.from("favorites").delete().eq("user_id", userId).eq("content_id", contentId);
  }

  if (error) {
    console.error("Supabase favorite failed", error);
    return { ok: false };
  }

  return { ok: true };
}

export async function getProfile(userId: string) {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return {
      user_id: userId,
      name: null,
      brand_name: null,
      brand_colors: null,
      target_audience: null,
      default_language: "Türkçe",
      writing_style: "Profesyonel",
    } satisfies ProfileSettings;
  }

  await ensureProfile(userId);

  const { data, error } = await supabase.from("profiles").select("*").eq("user_id", userId).single();

  if (error) {
    console.error("Supabase profile get failed", error);
    return null;
  }

  return data as ProfileSettings;
}

export async function updateProfile(userId: string, profile: Partial<ProfileSettings>) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { ok: true };

  const { error } = await supabase
    .from("profiles")
    .upsert({ ...profile, user_id: userId, updated_at: new Date().toISOString() }, { onConflict: "user_id" });

  if (error) {
    console.error("Supabase profile update failed", error);
    return { ok: false };
  }

  return { ok: true };
}
