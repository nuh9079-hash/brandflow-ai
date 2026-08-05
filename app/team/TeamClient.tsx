"use client";

import { useEffect, useState } from "react";
import { Button, Card, EmptyState, Input } from "@/components/ui";
import type { TeamInvitation, TeamMember, TeamRole, TeamWorkspace } from "@/lib/team/server";

type ApiResponse<T> = { data?: T; error?: string };
const roleLabels: Record<TeamRole, string> = { owner: "Owner", admin: "Admin", editor: "Editor", viewer: "Viewer" };
const statusLabels = { pending: "Davet bekliyor", active: "Aktif", suspended: "Askıda", removed: "Kaldırıldı" };
const date = (value: string | null) => value ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(new Date(value)) : "-";

function Skeleton() {
  return <div className="space-y-5"><Card className="h-32 animate-pulse bg-white/[0.03]"><span className="sr-only">Yükleniyor</span></Card><div className="grid gap-4 md:grid-cols-2">{[0, 1, 2].map((item) => <Card key={item} className="h-40 animate-pulse bg-white/[0.03]"><span className="sr-only">Yükleniyor</span></Card>)}</div></div>;
}

export function TeamClient() {
  const [workspace, setWorkspace] = useState<TeamWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Exclude<TeamRole, "owner">>("editor");

  async function load() {
    const response = await fetch("/api/team", { cache: "no-store" });
    const json = await response.json() as ApiResponse<TeamWorkspace>;
    if (!response.ok || !json.data) throw new Error(json.error || "Takım bilgileri yüklenemedi.");
    setWorkspace(json.data);
  }

  useEffect(() => {
    let active = true;
    fetch("/api/team", { cache: "no-store" }).then(async (response) => {
      const json = await response.json() as ApiResponse<TeamWorkspace>;
      if (!response.ok || !json.data) throw new Error(json.error || "Takım bilgileri yüklenemedi.");
      if (active) setWorkspace(json.data);
    }).catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "Takım bilgileri yüklenemedi."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function refresh() {
    try { await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Takım bilgileri yenilenemedi."); }
  }

  async function invite(event: React.FormEvent) {
    event.preventDefault(); if (!workspace) return; setBusy("invite"); setError(""); setNotice("");
    try {
      const response = await fetch("/api/team/invite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId: workspace.id, email, role: inviteRole }) });
      const json = await response.json() as ApiResponse<TeamInvitation>;
      if (!response.ok) throw new Error(json.error || "Davet oluşturulamadı.");
      setEmail(""); setNotice("Davet kaydı oluşturuldu. E-posta teslimi Clerk davet akışı bağlandığında etkinleşecek."); await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Davet oluşturulamadı."); }
    finally { setBusy(""); }
  }

  async function invitationAction(id: string, action: "resend" | "cancel") {
    setBusy(id + action); setError(""); setNotice("");
    try {
      const response = await fetch("/api/team/invite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ invitationId: id, action }) });
      const json = await response.json() as ApiResponse<unknown>;
      if (!response.ok) throw new Error(json.error || "Davet güncellenemedi.");
      setNotice(action === "cancel" ? "Davet iptal edildi." : "Davet yenilendi. E-posta teslimi henüz bağlı değil."); await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Davet güncellenemedi."); }
    finally { setBusy(""); }
  }

  async function updateMember(item: TeamMember, values: { role?: TeamRole; status?: string }) {
    setBusy(item.id); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/team/members/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
      const json = await response.json() as ApiResponse<TeamMember>;
      if (!response.ok) throw new Error(json.error || "Üye güncellenemedi.");
      setNotice("Üye bilgileri güncellendi."); await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Üye güncellenemedi."); }
    finally { setBusy(""); }
  }

  async function removeMember(item: TeamMember) {
    if (!window.confirm(`${item.name} çalışma alanından kaldırılsın mı?`)) return;
    setBusy(item.id); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/team/members/${item.id}`, { method: "DELETE" });
      const json = await response.json() as ApiResponse<unknown>;
      if (!response.ok) throw new Error(json.error || "Üye kaldırılamadı.");
      setNotice("Üye çalışma alanından kaldırıldı."); await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Üye kaldırılamadı."); }
    finally { setBusy(""); }
  }

  if (loading) return <Skeleton />;
  if (!workspace) return <Card className="p-8 text-center"><h2 className="text-lg font-bold text-white">Takım alanı açılamadı</h2><p className="mt-2 text-sm text-zinc-400">{error}</p><Button className="mt-5" onClick={() => window.location.reload()}>Tekrar dene</Button></Card>;
  const canManage = workspace.currentUserRole === "owner" || workspace.currentUserRole === "admin";

  return <div className="space-y-6">
    {(error || notice) && <div role="status" className={`rounded-lg border px-4 py-3 text-sm ${error ? "border-red-400/30 bg-red-400/10 text-red-200" : "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"}`}>{error || notice}</div>}
    <div className="grid gap-4 sm:grid-cols-3">
      <Card className="p-5"><p className="text-xs uppercase text-zinc-500">Çalışma alanı</p><p className="mt-2 text-lg font-bold text-white">{workspace.name}</p></Card>
      <Card className="p-5"><p className="text-xs uppercase text-zinc-500">Kullanılan kapasite</p><p className="mt-2 text-2xl font-bold text-white">{workspace.usedSlots} / {workspace.memberLimit}</p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-emerald-400" style={{ width: `${Math.min(100, workspace.usedSlots / workspace.memberLimit * 100)}%` }} /></div></Card>
      <Card className="p-5"><p className="text-xs uppercase text-zinc-500">Yetkin</p><p className="mt-2 text-lg font-bold text-white">{roleLabels[workspace.currentUserRole]}</p></Card>
    </div>

    {canManage && <Card className="p-5"><div className="mb-4"><h2 className="text-lg font-bold text-white">Üye davet et</h2><p className="mt-1 text-sm text-zinc-400">Davet, hassas token göstermeden güvenli biçimde bekleyen kayıt oluşturur.</p></div><form onSubmit={invite} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto] md:items-end"><Input label="E-posta" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="ekip@marka.com" /><label className="text-sm font-semibold text-zinc-200">Rol<select value={inviteRole} onChange={(event) => setInviteRole(event.target.value as Exclude<TeamRole, "owner">)} className="mt-2 w-full rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-sm"><option value="admin">Admin</option><option value="editor">Editor</option><option value="viewer">Viewer</option></select></label><Button type="submit" disabled={busy === "invite" || workspace.usedSlots >= workspace.memberLimit}>{busy === "invite" ? "Ekleniyor..." : "Davet oluştur"}</Button></form></Card>}

    <section><div className="mb-4 flex items-end justify-between"><div><h2 className="text-lg font-bold text-white">Takım üyeleri</h2><p className="mt-1 text-sm text-zinc-400">Aktif üyeler ve çalışma alanı rolleri.</p></div><span className="text-sm text-zinc-500">{workspace.members.length} üye</span></div>
      <div className="grid gap-4 xl:grid-cols-2">{workspace.members.map((item) => <Card key={item.id} className="p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-white">{item.name}</h3><span className={`rounded-full border px-2 py-0.5 text-xs ${item.status === "active" ? "border-emerald-400/30 text-emerald-300" : "border-amber-400/30 text-amber-300"}`}>{statusLabels[item.status]}</span></div><p className="mt-1 truncate text-sm text-zinc-400">{item.email || "E-posta bilgisi yok"}</p><p className="mt-3 text-xs text-zinc-500">Katılım: {date(item.joinedAt || item.createdAt)}</p></div>{canManage ? <div className="flex flex-wrap gap-2"><select aria-label="Üye rolü" value={item.role} disabled={busy === item.id} onChange={(event) => void updateMember(item, { role: event.target.value as TeamRole })} className="rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm"><option value="owner">Owner</option><option value="admin">Admin</option><option value="editor">Editor</option><option value="viewer">Viewer</option></select>{item.status === "active" ? <Button variant="secondary" disabled={busy === item.id} onClick={() => void updateMember(item, { status: "suspended" })}>Askıya al</Button> : <Button variant="secondary" disabled={busy === item.id} onClick={() => void updateMember(item, { status: "active" })}>Etkinleştir</Button>}<Button variant="ghost" disabled={busy === item.id} onClick={() => void removeMember(item)}>Kaldır</Button></div> : <span className="text-sm text-zinc-300">{roleLabels[item.role]}</span>}</div></Card>)}</div>
    </section>

    <section><div className="mb-4"><h2 className="text-lg font-bold text-white">Bekleyen davetler</h2><p className="mt-1 text-sm text-zinc-400">Henüz bir Clerk hesabıyla kabul edilmemiş davetler.</p></div>
      {workspace.invitations.length ? <div className="grid gap-4 xl:grid-cols-2">{workspace.invitations.map((item) => <Card key={item.id} className="p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-semibold text-white">{item.email}</h3><p className="mt-1 text-sm text-zinc-400">{roleLabels[item.role]} · {statusLabels[item.status]}</p><p className="mt-2 text-xs text-zinc-500">Davet: {date(item.invitedAt)} · Son geçerlilik: {date(item.expiresAt)}</p></div>{canManage && <div className="flex gap-2"><Button variant="secondary" disabled={busy !== ""} onClick={() => void invitationAction(item.id, "resend")}>Yenile</Button><Button variant="ghost" disabled={busy !== ""} onClick={() => void invitationAction(item.id, "cancel")}>İptal</Button></div>}</div></Card>)}</div> : <EmptyState title="Bekleyen davet yok" description="Yeni ekip arkadaşlarını e-posta adresleriyle davet edebilirsin." />}
    </section>
  </div>;
}
