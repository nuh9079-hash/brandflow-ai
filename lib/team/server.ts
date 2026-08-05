import { createHash, randomBytes } from "node:crypto";
import { getUserBillingPlan } from "@/lib/billing/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const teamRoles = ["owner", "admin", "editor", "viewer"] as const;
export const teamStatuses = ["pending", "active", "suspended", "removed"] as const;
export type TeamRole = (typeof teamRoles)[number];
export type TeamStatus = (typeof teamStatuses)[number];
export type TeamMember = { id: string; clerkUserId: string; name: string; email: string; role: TeamRole; status: TeamStatus; joinedAt: string | null; createdAt: string };
export type TeamInvitation = { id: string; email: string; role: Exclude<TeamRole, "owner">; status: TeamStatus; invitedAt: string; expiresAt: string; acceptedAt: string | null };
export type TeamWorkspace = { id: string; name: string; ownerClerkUserId: string; currentUserRole: TeamRole; members: TeamMember[]; invitations: TeamInvitation[]; memberLimit: number; usedSlots: number };
type Result<T> = { ok: true; data: T } | { ok: false; status: number; error: string };
type Row = Record<string, unknown>;

function role(value: unknown): TeamRole { return teamRoles.includes(value as TeamRole) ? value as TeamRole : "viewer"; }
function status(value: unknown): TeamStatus { return teamStatuses.includes(value as TeamStatus) ? value as TeamStatus : "pending"; }
function member(row: Row): TeamMember { return { id: String(row.id), clerkUserId: String(row.clerk_user_id), name: String(row.name || "BrandFlow kullanıcısı"), email: String(row.email || ""), role: role(row.role), status: status(row.status), joinedAt: typeof row.joined_at === "string" ? row.joined_at : null, createdAt: String(row.created_at || "") }; }
function invitation(row: Row): TeamInvitation { const itemRole = role(row.role); return { id: String(row.id), email: String(row.email || ""), role: itemRole === "owner" ? "viewer" : itemRole, status: status(row.status), invitedAt: String(row.invited_at || row.created_at || ""), expiresAt: String(row.expires_at || ""), acceptedAt: typeof row.accepted_at === "string" ? row.accepted_at : null }; }
function newTokenHash() { return createHash("sha256").update(randomBytes(32)).digest("hex"); }
function newExpiry() { return new Date(Date.now() + 7 * 86400000).toISOString(); }

async function currentMembership(userId: string, workspaceId: string) {
  const supabase = getSupabaseServerClient(); if (!supabase) return null;
  const { data } = await supabase.from("workspace_members").select("id,role").eq("workspace_id", workspaceId).eq("clerk_user_id", userId).eq("status", "active").maybeSingle();
  return data ? { id: String(data.id), role: role(data.role) } : null;
}

async function requireManager(userId: string, workspaceId: string): Promise<Result<{ role: TeamRole }>> {
  const current = await currentMembership(userId, workspaceId);
  return current && ["owner", "admin"].includes(current.role) ? { ok: true, data: { role: current.role } } : { ok: false, status: 403, error: "Bu işlem için owner veya admin yetkisi gerekli." };
}

export async function ensurePersonalWorkspace(userId: string, name: string, email: string): Promise<Result<string>> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { ok: false, status: 503, error: "Takım çalışma alanı için Supabase yapılandırılmamış." };
  const { data: existing, error: readError } = await supabase.from("workspaces").select("id").eq("owner_clerk_user_id", userId).eq("is_personal", true).maybeSingle();
  if (readError) return { ok: false, status: 500, error: "Çalışma alanı yüklenemedi. Team Workspace migration'ını kontrol et." };
  if (existing?.id) return { ok: true, data: String(existing.id) };
  const { data: workspace, error } = await supabase.from("workspaces").insert({ owner_clerk_user_id: userId, name: name ? `${name} Çalışma Alanı` : "Kişisel Çalışma Alanım", is_personal: true }).select("id").single();
  if (error || !workspace) return { ok: false, status: 500, error: "Kişisel çalışma alanı oluşturulamadı." };
  const { error: ownerError } = await supabase.from("workspace_members").insert({ workspace_id: workspace.id, clerk_user_id: userId, name: name || "BrandFlow kullanıcısı", email: email.toLowerCase(), role: "owner", status: "active", joined_at: new Date().toISOString() });
  if (ownerError) { await supabase.from("workspaces").delete().eq("id", workspace.id); return { ok: false, status: 500, error: "Çalışma alanı sahibi kaydedilemedi." }; }
  return { ok: true, data: String(workspace.id) };
}

export async function getTeamWorkspace(userId: string, identity: { name: string; email: string }): Promise<Result<TeamWorkspace>> {
  const ensured = await ensurePersonalWorkspace(userId, identity.name, identity.email); if (!ensured.ok) return ensured;
  const supabase = getSupabaseServerClient()!; const workspaceId = ensured.data;
  const [workspaceResult, membersResult, invitationsResult, billing] = await Promise.all([
    supabase.from("workspaces").select("id,name,owner_clerk_user_id").eq("id", workspaceId).single(),
    supabase.from("workspace_members").select("id,clerk_user_id,name,email,role,status,joined_at,created_at").eq("workspace_id", workspaceId).neq("status", "removed").order("created_at"),
    supabase.from("workspace_invitations").select("id,email,role,status,invited_at,expires_at,accepted_at,created_at").eq("workspace_id", workspaceId).eq("status", "pending").order("created_at", { ascending: false }),
    getUserBillingPlan(userId),
  ]);
  if (workspaceResult.error || membersResult.error || invitationsResult.error) return { ok: false, status: 500, error: "Takım bilgileri yüklenemedi." };
  const members = (membersResult.data || []).map((item) => member(item as Row));
  const invitations = (invitationsResult.data || []).map((item) => invitation(item as Row));
  const current = members.find((item) => item.clerkUserId === userId);
  if (!current) return { ok: false, status: 403, error: "Bu çalışma alanına erişimin yok." };
  const memberLimit = billing.plan.teamMemberLimit;
  return { ok: true, data: { id: workspaceId, name: String(workspaceResult.data.name), ownerClerkUserId: String(workspaceResult.data.owner_clerk_user_id), currentUserRole: current.role, members, invitations, memberLimit, usedSlots: members.length + invitations.length } };
}

export async function inviteTeamMember(userId: string, workspaceId: string, emailValue: unknown, roleValue: unknown): Promise<Result<TeamInvitation>> {
  const access = await requireManager(userId, workspaceId); if (!access.ok) return access;
  const email = typeof emailValue === "string" ? emailValue.trim().toLowerCase().slice(0, 320) : ""; const invitedRole = role(roleValue);
  if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, status: 400, error: "Geçerli bir e-posta adresi gir." };
  if (invitedRole === "owner") return { ok: false, status: 400, error: "Owner rolü davetle atanamaz." };
  const supabase = getSupabaseServerClient()!;
  const [members, invitations, billing, existing] = await Promise.all([
    supabase.from("workspace_members").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).neq("status", "removed"),
    supabase.from("workspace_invitations").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("status", "pending"),
    getUserBillingPlan(userId),
    supabase.from("workspace_members").select("id").eq("workspace_id", workspaceId).ilike("email", email).neq("status", "removed").maybeSingle(),
  ]);
  if (existing.data) return { ok: false, status: 409, error: "Bu kişi zaten çalışma alanında." };
  const limit = billing.plan.teamMemberLimit;
  if ((members.count || 0) + (invitations.count || 0) >= limit) return { ok: false, status: 403, error: `Planın en fazla ${limit} takım üyesini destekliyor.` };
  const { data, error } = await supabase.from("workspace_invitations").upsert({ workspace_id: workspaceId, email, role: invitedRole, status: "pending", invited_by_clerk_user_id: userId, token_hash: newTokenHash(), invited_at: new Date().toISOString(), expires_at: newExpiry(), accepted_at: null, cancelled_at: null, updated_at: new Date().toISOString() }, { onConflict: "workspace_id,email" }).select("id,email,role,status,invited_at,expires_at,accepted_at,created_at").single();
  return error || !data ? { ok: false, status: 500, error: "Davet oluşturulamadı." } : { ok: true, data: invitation(data as Row) };
}

export async function updateInvitation(userId: string, id: string, action: "resend" | "cancel"): Promise<Result<{ cancelled?: true; invitation?: TeamInvitation }>> {
  const supabase = getSupabaseServerClient(); if (!supabase) return { ok: false, status: 503, error: "Takım altyapısı yapılandırılmamış." };
  const { data: found } = await supabase.from("workspace_invitations").select("workspace_id").eq("id", id).maybeSingle();
  if (!found) return { ok: false, status: 404, error: "Davet bulunamadı." };
  const access = await requireManager(userId, String(found.workspace_id)); if (!access.ok) return access;
  if (action === "cancel") {
    const { error } = await supabase.from("workspace_invitations").update({ status: "removed", token_hash: null, cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", id).eq("status", "pending");
    return error ? { ok: false, status: 500, error: "Davet iptal edilemedi." } : { ok: true, data: { cancelled: true } };
  }
  const { data, error } = await supabase.from("workspace_invitations").update({ token_hash: newTokenHash(), invited_at: new Date().toISOString(), expires_at: newExpiry(), updated_at: new Date().toISOString() }).eq("id", id).eq("status", "pending").select("id,email,role,status,invited_at,expires_at,accepted_at,created_at").single();
  return error ? { ok: false, status: 500, error: "Davet yenilenemedi." } : { ok: true, data: { invitation: invitation(data as Row) } };
}

export async function updateTeamMember(userId: string, id: string, values: { role?: unknown; status?: unknown }): Promise<Result<TeamMember>> {
  const supabase = getSupabaseServerClient(); if (!supabase) return { ok: false, status: 503, error: "Takım altyapısı yapılandırılmamış." };
  const { data: target } = await supabase.from("workspace_members").select("*").eq("id", id).maybeSingle();
  if (!target) return { ok: false, status: 404, error: "Takım üyesi bulunamadı." };
  const access = await requireManager(userId, String(target.workspace_id)); if (!access.ok) return access;
  const nextRole = values.role === undefined ? role(target.role) : role(values.role); const nextStatus = values.status === undefined ? status(target.status) : status(values.status);
  if (nextRole === "owner" && access.data.role !== "owner") return { ok: false, status: 403, error: "Yalnızca owner başka bir owner atayabilir." };
  if (role(target.role) === "owner" && (nextRole !== "owner" || nextStatus !== "active")) {
    const { count } = await supabase.from("workspace_members").select("id", { count: "exact", head: true }).eq("workspace_id", target.workspace_id).eq("role", "owner").eq("status", "active");
    if ((count || 0) <= 1) return { ok: false, status: 409, error: "Son owner kaldırılamaz veya rolü değiştirilemez." };
  }
  const { data, error } = await supabase.from("workspace_members").update({ role: nextRole, status: nextStatus, updated_at: new Date().toISOString() }).eq("id", id).select("*").single();
  return error ? { ok: false, status: 500, error: "Üye güncellenemedi." } : { ok: true, data: member(data as Row) };
}

export async function removeTeamMember(userId: string, id: string): Promise<Result<{ removed: true }>> {
  const result = await updateTeamMember(userId, id, { status: "removed" });
  return result.ok ? { ok: true, data: { removed: true } } : result;
}
