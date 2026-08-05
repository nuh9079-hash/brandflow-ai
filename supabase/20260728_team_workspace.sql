create extension if not exists pgcrypto;

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_clerk_user_id text not null,
  name text not null,
  is_personal boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  clerk_user_id text not null,
  name text not null default '',
  email text not null default '',
  role text not null check (role in ('owner', 'admin', 'editor', 'viewer')),
  status text not null default 'active' check (status in ('pending', 'active', 'suspended', 'removed')),
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, clerk_user_id)
);

create table if not exists public.workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin', 'editor', 'viewer')),
  status text not null default 'pending' check (status in ('pending', 'active', 'suspended', 'removed')),
  invited_by_clerk_user_id text not null,
  token_hash text,
  invited_at timestamptz not null default now(),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists workspaces_personal_owner_unique on public.workspaces (owner_clerk_user_id) where is_personal = true;
create index if not exists workspaces_owner_idx on public.workspaces (owner_clerk_user_id);
create index if not exists workspace_members_workspace_idx on public.workspace_members (workspace_id);
create index if not exists workspace_members_user_idx on public.workspace_members (clerk_user_id);
create index if not exists workspace_members_role_status_idx on public.workspace_members (workspace_id, role, status);
create unique index if not exists workspace_invitations_email_unique on public.workspace_invitations (workspace_id, lower(email));
create index if not exists workspace_invitations_workspace_idx on public.workspace_invitations (workspace_id);
create index if not exists workspace_invitations_status_idx on public.workspace_invitations (workspace_id, status);

create or replace function public.team_current_user_id()
returns text language sql stable as $$
  select coalesce(auth.jwt() ->> 'sub', '');
$$;

create or replace function public.is_workspace_member(target_workspace_id uuid)
returns boolean language sql stable security definer set search_path = public set row_security = off as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = target_workspace_id
      and clerk_user_id = public.team_current_user_id()
      and status = 'active'
  );
$$;

create or replace function public.is_workspace_manager(target_workspace_id uuid)
returns boolean language sql stable security definer set search_path = public set row_security = off as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = target_workspace_id
      and clerk_user_id = public.team_current_user_id()
      and role in ('owner', 'admin')
      and status = 'active'
  );
$$;

create or replace function public.protect_last_workspace_owner()
returns trigger language plpgsql set search_path = public as $$
begin
  if old.role = 'owner' and old.status = 'active'
     and (tg_op = 'DELETE' or new.role <> 'owner' or new.status <> 'active') then
    if (select count(*) from public.workspace_members
        where workspace_id = old.workspace_id and role = 'owner' and status = 'active' and id <> old.id) = 0 then
      raise exception 'The last workspace owner cannot be removed';
    end if;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists protect_last_workspace_owner_trigger on public.workspace_members;
create trigger protect_last_workspace_owner_trigger before update or delete on public.workspace_members
for each row execute function public.protect_last_workspace_owner();

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invitations enable row level security;

drop policy if exists "workspace members read workspaces" on public.workspaces;
create policy "workspace members read workspaces" on public.workspaces for select using (public.is_workspace_member(id));
drop policy if exists "users create personal workspaces" on public.workspaces;
create policy "users create personal workspaces" on public.workspaces for insert with check (owner_clerk_user_id = public.team_current_user_id());
drop policy if exists "workspace managers update workspaces" on public.workspaces;
create policy "workspace managers update workspaces" on public.workspaces for update using (public.is_workspace_manager(id)) with check (public.is_workspace_manager(id));

drop policy if exists "workspace members read members" on public.workspace_members;
create policy "workspace members read members" on public.workspace_members for select using (public.is_workspace_member(workspace_id));
drop policy if exists "workspace managers create members" on public.workspace_members;
create policy "workspace managers create members" on public.workspace_members for insert with check (
  public.is_workspace_manager(workspace_id)
  or (clerk_user_id = public.team_current_user_id() and role = 'owner'
      and exists (select 1 from public.workspaces where id = workspace_id and owner_clerk_user_id = public.team_current_user_id()))
);
drop policy if exists "workspace managers update members" on public.workspace_members;
create policy "workspace managers update members" on public.workspace_members for update using (public.is_workspace_manager(workspace_id)) with check (public.is_workspace_manager(workspace_id));
drop policy if exists "workspace managers delete members" on public.workspace_members;
create policy "workspace managers delete members" on public.workspace_members for delete using (public.is_workspace_manager(workspace_id));

drop policy if exists "workspace members read invitations" on public.workspace_invitations;
create policy "workspace members read invitations" on public.workspace_invitations for select using (public.is_workspace_member(workspace_id));
drop policy if exists "workspace managers create invitations" on public.workspace_invitations;
create policy "workspace managers create invitations" on public.workspace_invitations for insert with check (public.is_workspace_manager(workspace_id));
drop policy if exists "workspace managers update invitations" on public.workspace_invitations;
create policy "workspace managers update invitations" on public.workspace_invitations for update using (public.is_workspace_manager(workspace_id)) with check (public.is_workspace_manager(workspace_id));
drop policy if exists "workspace managers delete invitations" on public.workspace_invitations;
create policy "workspace managers delete invitations" on public.workspace_invitations for delete using (public.is_workspace_manager(workspace_id));

revoke all on function public.is_workspace_member(uuid) from public;
revoke all on function public.is_workspace_manager(uuid) from public;
grant execute on function public.is_workspace_member(uuid) to authenticated;
grant execute on function public.is_workspace_manager(uuid) to authenticated;
