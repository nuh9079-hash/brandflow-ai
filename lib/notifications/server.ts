import { getSupabaseServerClient } from "@/lib/supabase/server";
import { notificationTypes, type AppNotification, type NotificationType } from "@/lib/notifications/types";

type NotificationInput = { type: NotificationType; title: string; description: string; href: string; metadata?: Record<string, unknown> };
type NotificationResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

function safeText(value: string, maxLength: number) { return value.trim().slice(0, maxLength); }

function logNotificationError(operation: string, error: unknown) {
  const value = error && typeof error === "object" ? error as Record<string, unknown> : {};
  console.error(`Supabase notifications error [${operation}]`, {
    code: value.code ?? null, message: value.message ?? String(error), details: value.details ?? null, hint: value.hint ?? null,
  });
}

function normalize(row: Record<string, unknown>): AppNotification {
  const storedType = String(row.type || "media_failed");
  return {
    id: String(row.id),
    type: notificationTypes.includes(storedType as NotificationType) ? storedType as NotificationType : "media_failed",
    title: String(row.title || "Bildirim"), description: String(row.description || ""), href: String(row.href || "/"),
    readAt: typeof row.read_at === "string" ? row.read_at : null, createdAt: String(row.created_at || ""),
  };
}

export async function createNotification(userId: string, input: NotificationInput): Promise<void> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return;
  const { error } = await supabase.from("notifications").insert({
    clerk_user_id: userId, type: input.type, title: safeText(input.title, 120),
    description: safeText(input.description, 360), href: safeText(input.href, 240) || "/", metadata: input.metadata ?? {},
  });
  if (error) logNotificationError("create", error);
}

export async function listNotifications(userId: string): Promise<NotificationResult<{ items: AppNotification[]; unreadCount: number }>> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { ok: false, status: 503, error: "Bildirim altyapısı yapılandırılmadı." };
  const { data, error } = await supabase.from("notifications")
    .select("id,type,title,description,href,read_at,created_at")
    .eq("clerk_user_id", userId).order("created_at", { ascending: false }).limit(100);
  if (error) {
    logNotificationError("list", error);
    return { ok: false, status: error.code === "PGRST205" ? 503 : 500, error: error.code === "PGRST205" ? "Bildirim tablosu henüz kurulmamış." : "Bildirimler yüklenemedi." };
  }
  const items = (data || []).map((row) => normalize(row as Record<string, unknown>));
  return { ok: true, data: { items, unreadCount: items.filter((item) => !item.readAt).length } };
}

export async function markNotificationsRead(userId: string, notificationId?: string): Promise<NotificationResult<{ updated: true }>> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { ok: false, status: 503, error: "Bildirim altyapısı yapılandırılmadı." };
  let query = supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("clerk_user_id", userId).is("read_at", null);
  if (notificationId) query = query.eq("id", notificationId);
  const { error } = await query;
  if (error) { logNotificationError("mark-read", error); return { ok: false, status: 500, error: "Bildirim durumu güncellenemedi." }; }
  return { ok: true, data: { updated: true } };
}
