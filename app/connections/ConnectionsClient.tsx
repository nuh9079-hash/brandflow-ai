"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, EmptyState } from "@/components/ui";
import type { ConnectionStatus, SafeSocialConnection, SocialPlatform } from "@/lib/social/connections";

const platforms: Array<{ id: SocialPlatform; name: string; icon: string }> = [
  { id: "instagram", name: "Instagram", icon: "IG" },
  { id: "facebook", name: "Facebook", icon: "f" },
  { id: "linkedin", name: "LinkedIn", icon: "in" },
  { id: "x", name: "X", icon: "X" },
  { id: "youtube", name: "YouTube", icon: "YT" },
  { id: "tiktok", name: "TikTok", icon: "TT" },
];

const statusLabels: Record<ConnectionStatus, string> = {
  disconnected: "Bağlanmadı",
  connecting: "Bağlanıyor",
  connected: "Bağlandı",
  expired: "Süresi doldu",
  error: "Hata",
};

const statusStyles: Record<ConnectionStatus, string> = {
  disconnected: "border-white/10 bg-white/5 text-zinc-400",
  connecting: "border-sky-400/30 bg-sky-400/10 text-sky-200",
  connected: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  expired: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  error: "border-red-400/30 bg-red-400/10 text-red-200",
};

type ApiResponse = { data?: SafeSocialConnection[] | { deleted: true }; error?: string };
type InstagramTestProfile = { id: string; username: string; accountType: string };
type InstagramTestResponse = { data?: InstagramTestProfile; error?: string };

function ConnectionSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {platforms.map((platform) => (
        <Card key={platform.id} className="h-64 animate-pulse p-5">
          <div className="h-11 w-11 rounded-lg bg-white/10" />
          <div className="mt-5 h-5 w-1/2 rounded bg-white/10" />
          <div className="mt-3 h-4 w-2/3 rounded bg-white/5" />
        </Card>
      ))}
    </div>
  );
}

export function ConnectionsClient({ instagramResult, instagramErrorCode }: { instagramResult?: string; instagramErrorCode?: string }) {
  const [connections, setConnections] = useState<SafeSocialConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(instagramResult === "connected" ? "Instagram hesabın başarıyla bağlandı." : "");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [testingInstagram, setTestingInstagram] = useState(false);
  const [instagramTest, setInstagramTest] = useState<{ profile?: InstagramTestProfile; error?: string } | null>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("instagram_oauth") !== "start") return;
    url.searchParams.delete("instagram_oauth");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    window.location.replace("/api/connections/instagram/start");
  }, []);

  const loadConnections = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/connections", { cache: "no-store" });
      const json = (await response.json()) as ApiResponse;
      if (!response.ok || !Array.isArray(json.data)) throw new Error(json.error || "Sosyal bağlantılar yüklenemedi.");
      setConnections(json.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Sosyal bağlantılar yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/connections", { cache: "no-store" })
      .then(async (response) => {
        const json = (await response.json()) as ApiResponse;
        if (!response.ok || !Array.isArray(json.data)) throw new Error(json.error || "Sosyal bağlantılar yüklenemedi.");
        if (active) setConnections(json.data);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Sosyal bağlantılar yüklenemedi.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const byPlatform = useMemo(() => {
    const map = new Map<SocialPlatform, SafeSocialConnection>();
    const priority: Record<ConnectionStatus, number> = { connected: 5, expired: 4, connecting: 3, error: 2, disconnected: 1 };
    for (const connection of connections) {
      const current = map.get(connection.platform);
      if (!current || priority[connection.status] > priority[current.status]) map.set(connection.platform, connection);
    }
    return map;
  }, [connections]);

  function connect(platform: SocialPlatform) {
    setError("");
    setNotice("");
    if (platform === "instagram") {
      window.location.assign("/api/connections/instagram/start");
      return;
    }
    setNotice("OAuth bağlantısı bu platform için sonraki adımda etkinleştirilecek.");
  }

  async function disconnect(connection: SafeSocialConnection) {
    setBusyId(connection.id);
    setError("");
    setNotice("");
    try {
      const instagram = connection.platform === "instagram";
      const response = await fetch(
        instagram ? "/api/connections/instagram/disconnect" : `/api/connections/${connection.id}`,
        instagram
          ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ connectionId: connection.id }) }
          : { method: "DELETE" },
      );
      const json = (await response.json()) as ApiResponse;
      if (!response.ok) throw new Error(json.error || "Bağlantı kaldırılamadı.");
      setConnections((current) => instagram
        ? current.map((item) => item.id === connection.id ? { ...item, status: "disconnected", tokenExpiresAt: null } : item)
        : current.filter((item) => item.id !== connection.id));
      setNotice(`${platforms.find((item) => item.id === connection.platform)?.name || "Hesap"} bağlantısı kaldırıldı.`);
    } catch (disconnectError) {
      setError(disconnectError instanceof Error ? disconnectError.message : "Bağlantı kaldırılamadı.");
    } finally {
      setBusyId(null);
    }
  }

  async function testInstagramConnection() {
    setTestingInstagram(true);
    setInstagramTest(null);
    try {
      const response = await fetch("/api/connections/instagram/test", { method: "POST" });
      const json = await response.json() as InstagramTestResponse;
      if (!response.ok || !json.data) throw new Error(json.error || "Instagram bağlantısı doğrulanamadı.");
      setInstagramTest({ profile: json.data });
    } catch (cause) {
      setInstagramTest({ error: cause instanceof Error ? cause.message : "Instagram bağlantısı doğrulanamadı." });
    } finally {
      setTestingInstagram(false);
    }
  }

  if (loading) return <ConnectionSkeleton />;
  if (error && connections.length === 0) {
    return <Card className="p-8 text-center"><h2 className="text-lg font-bold">Bağlantılar yüklenemedi</h2><p className="mt-2 text-sm text-zinc-400">{error}</p><Button className="mt-5" onClick={() => void loadConnections()}>Tekrar dene</Button></Card>;
  }

  const hasConnections = connections.some((item) => item.status === "connected");
  const callbackError = instagramResult === "error"
    ? `Instagram bağlantısı tamamlanamadı${instagramErrorCode ? ` (${instagramErrorCode})` : ""}.`
    : "";

  return (
    <div className="space-y-5">
      {(notice || error || callbackError) && (
        <div className={`rounded-lg border p-4 text-sm ${error || callbackError ? "border-red-400/30 bg-red-400/10 text-red-200" : "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"}`}>
          {error || callbackError || notice}
        </div>
      )}

      {!hasConnections && <EmptyState title="Henüz bağlı hesap yok" description="Platform kartlarından bağlantı akışını başlatabilirsin. OAuth etkinleştirilene kadar hesap bilgisi kaydedilmez." />}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {platforms.map((platform) => {
          const connection = byPlatform.get(platform.id);
          const status = connection?.status || "disconnected";
          const account = connection?.accountName || connection?.accountUsername;
          return (
            <Card key={platform.id} className="flex min-h-64 flex-col p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="grid h-11 w-11 place-items-center rounded-lg border border-white/10 bg-white/5 text-sm font-black text-white" aria-hidden="true">{platform.icon}</div>
                <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusStyles[status]}`}>{statusLabels[status]}</span>
              </div>
              <div className="mt-5">
                <h2 className="text-lg font-black text-white">{platform.name}</h2>
                <p className="mt-2 min-h-10 text-sm leading-5 text-zinc-400">
                  {account ? <><span className="font-semibold text-zinc-200">{account}</span>{connection?.accountUsername && connection.accountName ? ` · @${connection.accountUsername.replace(/^@/, "")}` : ""}</> : "Bu platformda bağlı hesap bulunmuyor."}
                </p>
                {connection?.lastError && status === "error" && <p className="mt-2 line-clamp-2 text-xs text-red-300">{connection.lastError}</p>}
              </div>
              <div className="mt-auto flex flex-wrap gap-2 pt-5">
                {status === "disconnected" && <Button onClick={() => connect(platform.id)}>Bağlan</Button>}
                {status === "expired" && <Button onClick={() => connect(platform.id)}>Yeniden bağlan</Button>}
                {status === "error" && <Button onClick={() => connect(platform.id)}>Tekrar dene</Button>}
                {status === "connecting" && <Button disabled>Bağlanıyor</Button>}
                {connection && status !== "disconnected" && <Button variant="secondary" disabled={busyId === connection.id} onClick={() => void disconnect(connection)}>{busyId === connection.id ? "Kaldırılıyor" : "Bağlantıyı kes"}</Button>}
                {platform.id === "instagram" && <Button variant="secondary" disabled={testingInstagram} onClick={() => void testInstagramConnection()}>{testingInstagram ? "Test ediliyor..." : "Bağlantıyı Test Et"}</Button>}
              </div>
              {platform.id === "instagram" && instagramTest?.profile && (
                <div className="mt-4 rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-3 text-xs leading-5 text-emerald-100">
                  Bağlantı doğrulandı: @{instagramTest.profile.username} · {instagramTest.profile.accountType} · ID {instagramTest.profile.id}
                </div>
              )}
              {platform.id === "instagram" && instagramTest?.error && (
                <div className="mt-4 rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-xs leading-5 text-red-200">
                  {instagramTest.error}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
