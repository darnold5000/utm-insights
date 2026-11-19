-- Centralized UTM analytics (Signal Works)
-- Prefix: sw_

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Dashboard admins (v1: single-owner list)
-- ---------------------------------------------------------------------------

create table if not exists public.sw_project_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.sw_project_admins enable row level security;

drop policy if exists sw_project_admins_select_self on public.sw_project_admins;
create policy sw_project_admins_select_self
on public.sw_project_admins
for select
to authenticated
using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Projects
-- ---------------------------------------------------------------------------

create table if not exists public.sw_projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  website_domain text not null,
  public_key text not null unique,
  allowed_origins text[] not null default '{}',
  is_active boolean not null default true,
  conversion_secret_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sw_projects_public_key_idx on public.sw_projects (public_key);
create index if not exists sw_projects_active_idx on public.sw_projects (is_active) where is_active;

alter table public.sw_projects enable row level security;

drop policy if exists sw_projects_select_admin on public.sw_projects;
create policy sw_projects_select_admin
on public.sw_projects
for select
to authenticated
using (exists (select 1 from public.sw_project_admins a where a.user_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- Saved campaign links
-- ---------------------------------------------------------------------------

create table if not exists public.sw_saved_links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.sw_projects (id) on delete cascade,
  name text not null,
  destination_url text not null,
  utm_source text not null,
  utm_medium text not null,
  utm_campaign text not null,
  utm_content text,
  utm_term text,
  link_type text not null default 'organic'
    check (link_type in ('organic', 'paid', 'email', 'sms', 'qr', 'referral')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sw_saved_links_project_idx on public.sw_saved_links (project_id, created_at desc);

alter table public.sw_saved_links enable row level security;

drop policy if exists sw_saved_links_select_admin on public.sw_saved_links;
drop policy if exists sw_saved_links_insert_admin on public.sw_saved_links;
drop policy if exists sw_saved_links_update_admin on public.sw_saved_links;
drop policy if exists sw_saved_links_delete_admin on public.sw_saved_links;
create policy sw_saved_links_select_admin
on public.sw_saved_links
for select
to authenticated
using (exists (select 1 from public.sw_project_admins a where a.user_id = auth.uid()));

create policy sw_saved_links_insert_admin
on public.sw_saved_links
for insert
to authenticated
with check (exists (select 1 from public.sw_project_admins a where a.user_id = auth.uid()));

create policy sw_saved_links_update_admin
on public.sw_saved_links
for update
to authenticated
using (exists (select 1 from public.sw_project_admins a where a.user_id = auth.uid()));

create policy sw_saved_links_delete_admin
on public.sw_saved_links
for delete
to authenticated
using (exists (select 1 from public.sw_project_admins a where a.user_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- Tracking events (writes via service role API only)
-- ---------------------------------------------------------------------------

create table if not exists public.sw_tracking_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.sw_projects (id) on delete cascade,
  event_id text,
  visitor_id uuid not null,
  session_id uuid not null,
  event_type text not null,
  occurred_at timestamptz not null,
  page_path text,
  landing_page text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  utm_id text,
  ft_utm_source text,
  ft_utm_medium text,
  ft_utm_campaign text,
  ft_utm_content text,
  ft_utm_term text,
  lt_utm_source text,
  lt_utm_medium text,
  lt_utm_campaign text,
  lt_utm_content text,
  lt_utm_term text,
  created_at timestamptz not null default now()
);

create unique index if not exists sw_tracking_events_dedup_idx
  on public.sw_tracking_events (project_id, event_id)
  where event_id is not null;

create index if not exists sw_tracking_events_project_time_idx
  on public.sw_tracking_events (project_id, occurred_at desc);

create index if not exists sw_tracking_events_project_type_idx
  on public.sw_tracking_events (project_id, event_type, occurred_at desc);

create index if not exists sw_tracking_events_visitor_idx
  on public.sw_tracking_events (project_id, visitor_id, occurred_at desc);

create index if not exists sw_tracking_events_campaign_idx
  on public.sw_tracking_events (project_id, ft_utm_campaign, occurred_at desc)
  where ft_utm_campaign is not null;

alter table public.sw_tracking_events enable row level security;

drop policy if exists sw_tracking_events_select_admin on public.sw_tracking_events;
create policy sw_tracking_events_select_admin
on public.sw_tracking_events
for select
to authenticated
using (exists (select 1 from public.sw_project_admins a where a.user_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- Seed projects (public keys are identifiers, not secrets)
-- ---------------------------------------------------------------------------

insert into public.sw_projects (id, name, website_domain, public_key, allowed_origins)
values
  (
    'a0000001-0000-4000-8000-000000000001',
    'MeetDayLive',
    'meetdaylive.com',
    'pk_mdl_dev_seed_001',
    array['https://meetdaylive.com', 'https://www.meetdaylive.com', 'http://localhost:3000']
  ),
  (
    'a0000001-0000-4000-8000-000000000002',
    'CoachSlate',
    'coachslate.com',
    'pk_csl_dev_seed_001',
    array['https://coachslate.com', 'https://www.coachslate.com', 'http://localhost:3001']
  ),
  (
    'a0000001-0000-4000-8000-000000000003',
    'Signal Works',
    'hiresignalworks.com',
    'pk_sw_dev_seed_001',
    array['https://hiresignalworks.com', 'https://www.hiresignalworks.com', 'http://localhost:3002']
  )
on conflict (id) do nothing;