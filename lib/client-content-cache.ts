import type { GeneratedContentRecord } from "@/lib/content-store";

type CacheInput = {
  id?: string;
  user_id?: string;
  product: string;
  tone: string;
  content: string;
  sections?: Record<string, string> | null;
  is_favorite?: boolean;
  created_at?: string;
};

const cachePrefix = "brandflow:generated:";
const maxCachedItems = 30;

function keyForUser(userId: string) {
  return `${cachePrefix}${userId}`;
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function uniqueItems(items: GeneratedContentRecord[]) {
  const map = new Map<string, GeneratedContentRecord>();
  for (const item of items) {
    map.set(item.id, item);
  }
  return Array.from(map.values()).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function readCachedGeneratedContents(userId?: string | null) {
  if (!userId || !canUseStorage()) return [] as GeneratedContentRecord[];

  try {
    const raw = window.localStorage.getItem(keyForUser(userId));
    if (!raw) return [] as GeneratedContentRecord[];
    const parsed = JSON.parse(raw) as GeneratedContentRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [] as GeneratedContentRecord[];
  }
}

export function mergeGeneratedContents(items: GeneratedContentRecord[], cachedItems: GeneratedContentRecord[]) {
  return uniqueItems([...items, ...cachedItems]);
}

export function cacheGeneratedContent(userId: string, input: CacheInput) {
  if (!canUseStorage()) return null;

  const item: GeneratedContentRecord = {
    id: input.id ?? `local-${Date.now()}`,
    user_id: input.user_id ?? userId,
    product: input.product,
    tone: input.tone,
    content: input.content,
    sections: input.sections ?? null,
    is_favorite: input.is_favorite ?? false,
    created_at: input.created_at ?? new Date().toISOString(),
  };
  const nextItems = uniqueItems([item, ...readCachedGeneratedContents(userId)]).slice(0, maxCachedItems);
  window.localStorage.setItem(keyForUser(userId), JSON.stringify(nextItems));

  return item;
}

export function removeCachedGeneratedContent(userId: string | undefined, contentId: string) {
  if (!userId || !canUseStorage()) return;

  const nextItems = readCachedGeneratedContents(userId).filter((item) => item.id !== contentId);
  window.localStorage.setItem(keyForUser(userId), JSON.stringify(nextItems));
}

export function setCachedGeneratedContentFavorite(userId: string | undefined, contentId: string, favorite: boolean) {
  if (!userId || !canUseStorage()) return;

  const nextItems = readCachedGeneratedContents(userId).map((item) =>
    item.id === contentId ? { ...item, is_favorite: favorite } : item
  );
  window.localStorage.setItem(keyForUser(userId), JSON.stringify(nextItems));
}
