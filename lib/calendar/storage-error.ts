// Classify provider errors without exposing credentials, SQL or user data.
export function calendarStorageError(error: { code?: string; message?: string }) {
  const message = error.message || "";
  const code = error.code || "";
  const category = /fetch failed|network|ENOTFOUND/i.test(message) ? "connection"
    : /invalid api key|invalid.*jwt/i.test(message) || ["PGRST301", "PGRST303"].includes(code) ? "credentials"
    : ["42P01", "42703", "PGRST200", "PGRST204", "PGRST205"].includes(code) ? "schema"
    : code === "42501" ? "permissions" : "unknown";
  console.error("Calendar storage operation failed", { category });
  const messages = {
    connection: "Takvim veritabanına şu an ulaşılamıyor. Biraz sonra tekrar dene.",
    credentials: "Takvim bağlantısı doğrulanamadı. Hizmet ayarlarının düzeltilmesi gerekiyor.",
    schema: "Takvim altyapısı henüz hazır değil. Kurulumun tamamlanması gerekiyor.",
    permissions: "Takvim kaydı için gerekli erişim sağlanamadı.",
    unknown: "Takvim işlemi tamamlanamadı. Lütfen tekrar dene.",
  };
  return { ok: false as const, status: category === "unknown" ? 500 : 503, error: messages[category] };
}
