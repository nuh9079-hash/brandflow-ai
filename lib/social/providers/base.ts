import type { SocialPlatform, SocialProvider, SocialProviderResult, SocialProviderStatus } from "@/lib/social/types";

type ProviderConfig = {
  platform: SocialPlatform;
  label: string;
  requiredEnv: string[];
};

function hasOAuthConfig(requiredEnv: string[]) {
  return requiredEnv.every((key) => Boolean(process.env[key]?.trim()));
}

export function createProvider({ platform, label, requiredEnv }: ProviderConfig): SocialProvider {
  async function getStatus(): Promise<SocialProviderStatus> {
    const configured = hasOAuthConfig(requiredEnv);

    return {
      platform,
      label,
      connected: false,
      configured,
      requiredEnv,
      message: configured
        ? "OAuth ayarları var, ancak kullanıcı hesabı henüz bağlanmadı."
        : "Bağlanmadı. OAuth ayarları henüz eklenmedi.",
    };
  }

  async function unavailable(action: string): Promise<SocialProviderResult> {
    const status = await getStatus();

    if (!status.configured) {
      return {
        ok: false,
        message: `${label} için OAuth ayarları olmadığı için ${action} yapılamaz.`,
      };
    }

    return {
      ok: false,
      message: `${label} hesabı bağlı olmadığı için ${action} yapılamaz.`,
    };
  }

  return {
    platform,
    label,
    connect: () => unavailable("bağlantı"),
    disconnect: () => unavailable("bağlantı kesme"),
    publish: () => unavailable("paylaşım"),
    getStatus,
  };
}
