-- Extensions
create extension if not exists "pgcrypto";

-- Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  role text not null default 'dev' check (role in ('admin', 'commercial', 'marketing', 'dev', 'designer')),
  sales_group text not null default 'groupe-a' check (sales_group in ('groupe-a', 'groupe-b', 'groupe-c')),
  is_blocked boolean not null default false,
  access_reset_at timestamptz,
  connection_status text not null default 'offline' check (connection_status in ('online', 'offline')),
  last_login_at timestamptz,
  last_logout_at timestamptz,
  last_latitude numeric(10,7),
  last_longitude numeric(10,7),
  last_geo_label text,
  created_at timestamptz not null default now()
);

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('admin', 'commercial', 'marketing', 'dev', 'designer'));
alter table public.profiles drop constraint if exists profiles_sales_group_check;
alter table public.profiles
  add constraint profiles_sales_group_check
  check (sales_group in ('groupe-a', 'groupe-b', 'groupe-c'));
alter table public.profiles drop constraint if exists profiles_connection_status_check;
alter table public.profiles
  add constraint profiles_connection_status_check
  check (connection_status in ('online', 'offline'));

-- Connection history
create table if not exists public.connection_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  status text not null default 'online' check (status in ('online', 'offline')),
  login_at timestamptz not null default now(),
  logout_at timestamptz,
  latitude numeric(10,7),
  longitude numeric(10,7),
  geo_label text,
  user_agent text,
  ip_address text,
  created_at timestamptz not null default now()
);

-- Clients
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  nom text not null,
  entreprise text,
  telephone text,
  email text not null,
  statut text not null default 'prospect' check (statut in ('prospect', 'en cours', 'client')),
  created_at timestamptz not null default now()
);

-- Projects
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  nom text not null,
  type text not null default 'site web',
  statut text not null default 'en attente' check (statut in ('en attente', 'en cours', 'termine')),
  assigned_to uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Tasks
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  titre text not null,
  description text,
  assigned_to uuid references auth.users(id) on delete set null,
  statut text not null default 'todo' check (statut in ('todo', 'in_progress', 'done')),
  deadline date,
  created_at timestamptz not null default now()
);

-- Project members
create table if not exists public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(project_id, user_id)
);

-- Activity reports
create table if not exists public.activity_reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  description text not null,
  screenshot_path text not null,
  status text not null default 'en cours' check (status in ('en cours', 'termine')),
  created_at timestamptz not null default now()
);

-- Commercial onboarding documents
create table if not exists public.client_documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  doc_type text not null check (doc_type in ('cni', 'passeport')),
  storage_path text not null,
  file_name text not null,
  created_at timestamptz not null default now()
);

-- Client signatures
create table if not exists public.client_signatures (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  signature_data_url text not null,
  created_at timestamptz not null default now()
);

-- Files index
create table if not exists public.files_index (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text,
  created_at timestamptz not null default now()
);

-- CMS
create table if not exists public.pages_content (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  section text not null,
  contenu jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete set null,
  scope text not null default 'user' check (scope in ('user', 'role', 'global')),
  target_role text,
  target_user_id uuid references auth.users(id) on delete set null,
  title text,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications alter column owner_id drop not null;
alter table public.notifications drop constraint if exists notifications_scope_check;
alter table public.notifications
  add constraint notifications_scope_check
  check (scope in ('user', 'role', 'global'));

create table if not exists public.notification_reads (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz not null default now(),
  unique(notification_id, user_id)
);

-- Trigger profile creation
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles(id, full_name, email, role)
  values(
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'dev')
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    role = coalesce(excluded.role, public.profiles.role);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.project_members enable row level security;
alter table public.activity_reports enable row level security;
alter table public.client_documents enable row level security;
alter table public.client_signatures enable row level security;
alter table public.files_index enable row level security;
alter table public.pages_content enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_reads enable row level security;
alter table public.connection_logs enable row level security;

drop policy if exists "profiles self read" on public.profiles;
drop policy if exists "profiles self or admin read" on public.profiles;
create policy "profiles self or admin read" on public.profiles
for select using (
  auth.uid() = id
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);
drop policy if exists "profiles self upsert" on public.profiles;
create policy "profiles self upsert" on public.profiles
for insert with check (auth.uid() = id);
drop policy if exists "profiles self update or admin" on public.profiles;
create policy "profiles self update or admin" on public.profiles
for update using (
  auth.uid() = id
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
)
with check (
  auth.uid() = id
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

drop policy if exists "owner all clients" on public.clients;
drop policy if exists "clients owner or admin" on public.clients;
create policy "clients owner or admin" on public.clients
for all using (
  auth.uid() = owner_id
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
)
with check (
  auth.uid() = owner_id
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

drop policy if exists "owner all projects" on public.projects;
drop policy if exists "projects select owner assigned admin" on public.projects;
create policy "projects select owner assigned admin" on public.projects
for select using (
  auth.uid() = owner_id
  or auth.uid() = assigned_to
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);
drop policy if exists "projects modify owner admin" on public.projects;
create policy "projects modify owner admin" on public.projects
for all using (
  auth.uid() = owner_id
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
)
with check (
  auth.uid() = owner_id
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

drop policy if exists "owner all tasks" on public.tasks;
create policy "owner all tasks" on public.tasks for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "project members read self admin" on public.project_members;
create policy "project members read self admin" on public.project_members
for select using (
  auth.uid() = user_id
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);
drop policy if exists "project members manage admin" on public.project_members;
create policy "project members manage admin" on public.project_members
for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
)
with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

drop policy if exists "activity reports read own admin" on public.activity_reports;
create policy "activity reports read own admin" on public.activity_reports
for select using (
  auth.uid() = user_id
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

drop policy if exists "activity reports insert own admin" on public.activity_reports;
create policy "activity reports insert own admin" on public.activity_reports
for insert with check (
  auth.uid() = user_id
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

drop policy if exists "activity reports update own admin" on public.activity_reports;
create policy "activity reports update own admin" on public.activity_reports
for update using (
  auth.uid() = user_id
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
)
with check (
  auth.uid() = user_id
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

drop policy if exists "activity reports delete own admin" on public.activity_reports;
create policy "activity reports delete own admin" on public.activity_reports
for delete using (
  auth.uid() = user_id
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

drop policy if exists "owner all files_index" on public.files_index;
create policy "owner all files_index" on public.files_index for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "owner all pages_content" on public.pages_content;
create policy "owner all pages_content" on public.pages_content for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "owner all notifications" on public.notifications;
drop policy if exists "notifications read target" on public.notifications;
create policy "notifications read target" on public.notifications
for select using (
  owner_id = auth.uid()
  or target_user_id = auth.uid()
  or scope = 'global'
  or (
    scope = 'role'
    and exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.role = target_role
    )
  )
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

drop policy if exists "notifications admin manage" on public.notifications;
create policy "notifications admin manage" on public.notifications
for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
)
with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

drop policy if exists "notification reads self all" on public.notification_reads;
create policy "notification reads self all" on public.notification_reads
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "connection logs self or admin read" on public.connection_logs;
create policy "connection logs self or admin read" on public.connection_logs
for select using (
  auth.uid() = user_id
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

drop policy if exists "connection logs self insert" on public.connection_logs;
create policy "connection logs self insert" on public.connection_logs
for insert with check (auth.uid() = user_id);

drop policy if exists "connection logs self update own" on public.connection_logs;
create policy "connection logs self update own" on public.connection_logs
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "client documents owner or admin" on public.client_documents;
create policy "client documents owner or admin" on public.client_documents
for all using (
  auth.uid() = owner_id
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
)
with check (
  auth.uid() = owner_id
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

drop policy if exists "client signatures owner or admin" on public.client_signatures;
create policy "client signatures owner or admin" on public.client_signatures
for all using (
  auth.uid() = owner_id
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
)
with check (
  auth.uid() = owner_id
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- Storage bucket and policy
insert into storage.buckets(id, name, public)
values('client-files', 'client-files', true)
on conflict (id) do nothing;

insert into storage.buckets(id, name, public)
values('activity-reports', 'activity-reports', true)
on conflict (id) do nothing;

insert into storage.buckets(id, name, public)
values('client-documents', 'client-documents', false)
on conflict (id) do nothing;

drop policy if exists "owner storage access" on storage.objects;
create policy "owner storage access" on storage.objects
for all using (auth.uid()::text = split_part(name, '/', 1))
with check (auth.uid()::text = split_part(name, '/', 1));
