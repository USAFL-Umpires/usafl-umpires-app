-- USAFL Umpires hub — core schema.
-- Roles: applicant (prospective) → umpire (current) → coach (staff) → admin (committee).
-- RLS is on for every table. Staff = coach or admin.

-- ───────────── Types ─────────────
create type public.user_role as enum ('applicant', 'umpire', 'coach', 'admin');
create type public.application_status as enum ('draft', 'submitted', 'under_review', 'approved', 'declined', 'withdrawn');
create type public.discipline as enum ('field', 'boundary', 'goal', 'coach');
create type public.compliance_status as enum ('missing', 'pending_review', 'approved', 'rejected', 'expired');
create type public.assignment_status as enum ('assigned', 'in_progress', 'completed');

-- ───────────── Private helpers (not exposed through the API) ─────────────
create schema if not exists private;
grant usage on schema private to authenticated;

create or replace function private.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;

-- ───────────── Profiles ─────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  preferred_name text,
  phone text,
  city text,
  state text,
  country text default 'USA',
  home_club text,
  disciplines public.discipline[] not null default '{}',
  bio text,
  avatar_path text,
  role public.user_role not null default 'applicant',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create or replace function private.my_role() returns public.user_role
language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = auth.uid() and is_active
$$;
create or replace function private.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(private.my_role() in ('coach', 'admin'), false)
$$;
create or replace function private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(private.my_role() = 'admin', false)
$$;
revoke all on function private.my_role(), private.is_staff(), private.is_admin() from public, anon;
grant execute on function private.my_role(), private.is_staff(), private.is_admin() to authenticated;

-- New sign-up → profile row (role applicant).
create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, nullif(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

-- Members can edit their own details, but only staff change role/active, and only admins grant coach/admin.
create or replace function private.guard_profile() returns trigger
language plpgsql set search_path = '' as $$
begin
  if auth.uid() is null then return new; end if;  -- server / dashboard
  if new.id <> old.id or new.email <> old.email or new.created_at <> old.created_at then
    raise exception 'These fields cannot be changed';
  end if;
  if (new.role <> old.role or new.is_active <> old.is_active) and not private.is_staff() then
    raise exception 'Only coaches or admins can change role or status';
  end if;
  if new.role <> old.role and (new.role in ('coach', 'admin') or old.role in ('coach', 'admin')) and not private.is_admin() then
    raise exception 'Only admins can grant or remove coach/admin';
  end if;
  return new;
end $$;
create trigger guard_profile before update on public.profiles
  for each row execute function private.guard_profile();
create trigger profiles_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();

create policy "Profiles: read own or staff" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select private.is_staff()));
create policy "Profiles: update own or staff" on public.profiles for update to authenticated
  using (id = (select auth.uid()) or (select private.is_staff()))
  with check (id = (select auth.uid()) or (select private.is_staff()));

-- ───────────── Applications (replaces the Microsoft Form) ─────────────
create table public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  status public.application_status not null default 'draft',
  answers jsonb not null default '{}',
  submitted_at timestamptz,
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  decision_message text,           -- shown to the applicant
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.applications enable row level security;
create index on public.applications (reviewed_by);
create index on public.applications (status);

create or replace function private.guard_application() returns trigger
language plpgsql set search_path = '' as $$
begin
  if auth.uid() is null or private.is_staff() then return new; end if;
  if tg_op = 'INSERT' then
    if new.status not in ('draft', 'submitted') or new.reviewed_by is not null or new.decision_message is not null then
      raise exception 'Not allowed';
    end if;
  else
    if old.status not in ('draft', 'submitted') and new.status <> old.status and new.status <> 'withdrawn' then
      raise exception 'This application is already being reviewed';
    end if;
    if new.status not in ('draft', 'submitted', 'withdrawn') and new.status <> old.status then
      raise exception 'Not allowed';
    end if;
    if new.reviewed_by is distinct from old.reviewed_by or new.reviewed_at is distinct from old.reviewed_at
       or new.decision_message is distinct from old.decision_message then
      raise exception 'Not allowed';
    end if;
    if old.status not in ('draft') and new.answers <> old.answers then
      raise exception 'Answers are locked once submitted';
    end if;
  end if;
  if new.status = 'submitted' and new.submitted_at is null then new.submitted_at = now(); end if;
  return new;
end $$;
create trigger guard_application before insert or update on public.applications
  for each row execute function private.guard_application();
create trigger applications_updated_at before update on public.applications
  for each row execute function private.set_updated_at();

create policy "Applications: read own or staff" on public.applications for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_staff()));
create policy "Applications: create own" on public.applications for insert to authenticated
  with check (user_id = (select auth.uid()) or (select private.is_staff()));
create policy "Applications: update own or staff" on public.applications for update to authenticated
  using (user_id = (select auth.uid()) or (select private.is_staff()))
  with check (user_id = (select auth.uid()) or (select private.is_staff()));
create policy "Applications: staff delete" on public.applications for delete to authenticated
  using ((select private.is_staff()));

-- Staff-only notes on any member (applications, observations, follow-ups).
create table public.staff_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null default auth.uid(),
  body text not null,
  created_at timestamptz not null default now()
);
alter table public.staff_notes enable row level security;
create index on public.staff_notes (user_id);
create index on public.staff_notes (author_id);
create policy "Staff notes: staff only" on public.staff_notes for all to authenticated
  using ((select private.is_staff())) with check ((select private.is_staff()));

-- ───────────── Onboarding (getting-started guide for prospective umpires) ─────────────
create table public.onboarding_steps (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  link_url text,
  audience public.user_role[] not null default '{applicant}',
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.onboarding_steps enable row level security;
create policy "Onboarding steps: read published" on public.onboarding_steps for select to authenticated
  using (published or (select private.is_staff()));
create policy "Onboarding steps: staff write" on public.onboarding_steps for all to authenticated
  using ((select private.is_staff())) with check ((select private.is_staff()));

create table public.onboarding_progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  step_id uuid not null references public.onboarding_steps (id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, step_id)
);
alter table public.onboarding_progress enable row level security;
create index on public.onboarding_progress (step_id);
create policy "Onboarding progress: read own or staff" on public.onboarding_progress for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_staff()));
create policy "Onboarding progress: tick own" on public.onboarding_progress for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "Onboarding progress: untick own" on public.onboarding_progress for delete to authenticated
  using (user_id = (select auth.uid()) or (select private.is_staff()));

-- ───────────── Accreditation (staff-managed) ─────────────
create table public.accreditations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  discipline public.discipline not null,
  level text not null,
  awarded_on date not null default current_date,
  expires_on date,
  awarded_by uuid references public.profiles (id) on delete set null default auth.uid(),
  notes text,
  created_at timestamptz not null default now()
);
alter table public.accreditations enable row level security;
create index on public.accreditations (user_id);
create index on public.accreditations (awarded_by);
create policy "Accreditations: read own or staff" on public.accreditations for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_staff()));
create policy "Accreditations: staff insert" on public.accreditations for insert to authenticated
  with check ((select private.is_staff()));
create policy "Accreditations: staff update" on public.accreditations for update to authenticated
  using ((select private.is_staff())) with check ((select private.is_staff()));
create policy "Accreditations: staff delete" on public.accreditations for delete to authenticated
  using ((select private.is_staff()));

-- ───────────── Compliance (e.g. SafeSport, background check, rules test) ─────────────
create table public.compliance_requirements (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  link_url text,
  applies_to public.user_role[] not null default '{umpire,coach,admin}',
  renew_months int,
  requires_upload boolean not null default false,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.compliance_requirements enable row level security;
create policy "Compliance reqs: read" on public.compliance_requirements for select to authenticated
  using (active or (select private.is_staff()));
create policy "Compliance reqs: staff write" on public.compliance_requirements for all to authenticated
  using ((select private.is_staff())) with check ((select private.is_staff()));

create table public.member_compliance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  requirement_id uuid not null references public.compliance_requirements (id) on delete cascade,
  status public.compliance_status not null default 'pending_review',
  completed_on date,
  expires_on date,
  evidence_path text,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, requirement_id)
);
alter table public.member_compliance enable row level security;
create index on public.member_compliance (requirement_id);
create index on public.member_compliance (reviewed_by);

create or replace function private.guard_compliance() returns trigger
language plpgsql set search_path = '' as $$
begin
  if auth.uid() is null or private.is_staff() then return new; end if;
  -- Members can submit/resubmit evidence; only staff approve.
  new.status = 'pending_review';
  new.reviewed_by = null;
  new.reviewed_at = null;
  return new;
end $$;
create trigger guard_compliance before insert or update on public.member_compliance
  for each row execute function private.guard_compliance();
create trigger member_compliance_updated_at before update on public.member_compliance
  for each row execute function private.set_updated_at();

create policy "Member compliance: read own or staff" on public.member_compliance for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_staff()));
create policy "Member compliance: submit own" on public.member_compliance for insert to authenticated
  with check (user_id = (select auth.uid()) or (select private.is_staff()));
create policy "Member compliance: update own or staff" on public.member_compliance for update to authenticated
  using (user_id = (select auth.uid()) or (select private.is_staff()))
  with check (user_id = (select auth.uid()) or (select private.is_staff()));
create policy "Member compliance: staff delete" on public.member_compliance for delete to authenticated
  using ((select private.is_staff()));

-- ───────────── Learning (coaches assign modules) ─────────────
create table public.learning_modules (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text,
  content jsonb not null default '[]',   -- ordered blocks: text, video, quiz…
  discipline public.discipline,
  estimated_minutes int,
  published boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.learning_modules enable row level security;
create index on public.learning_modules (created_by);
create trigger learning_modules_updated_at before update on public.learning_modules
  for each row execute function private.set_updated_at();
create policy "Modules: read published" on public.learning_modules for select to authenticated
  using (published or (select private.is_staff()));
create policy "Modules: staff write" on public.learning_modules for all to authenticated
  using ((select private.is_staff())) with check ((select private.is_staff()));

create table public.learning_assignments (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.learning_modules (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  assigned_by uuid references public.profiles (id) on delete set null default auth.uid(),
  assigned_at timestamptz not null default now(),
  due_on date,
  status public.assignment_status not null default 'assigned',
  progress jsonb not null default '{}',
  score numeric,
  completed_at timestamptz,
  unique (module_id, user_id)
);
alter table public.learning_assignments enable row level security;
create index on public.learning_assignments (user_id);
create index on public.learning_assignments (assigned_by);

create or replace function private.guard_assignment() returns trigger
language plpgsql set search_path = '' as $$
begin
  if auth.uid() is null or private.is_staff() then return new; end if;
  -- Members may only record their own progress.
  if new.module_id <> old.module_id or new.user_id <> old.user_id or new.assigned_by is distinct from old.assigned_by
     or new.assigned_at <> old.assigned_at or new.due_on is distinct from old.due_on then
    raise exception 'Not allowed';
  end if;
  if new.status = 'completed' and new.completed_at is null then new.completed_at = now(); end if;
  return new;
end $$;
create trigger guard_assignment before update on public.learning_assignments
  for each row execute function private.guard_assignment();

create policy "Assignments: read own or staff" on public.learning_assignments for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_staff()));
create policy "Assignments: staff assign" on public.learning_assignments for insert to authenticated
  with check ((select private.is_staff()));
create policy "Assignments: update own progress or staff" on public.learning_assignments for update to authenticated
  using (user_id = (select auth.uid()) or (select private.is_staff()))
  with check (user_id = (select auth.uid()) or (select private.is_staff()));
create policy "Assignments: staff delete" on public.learning_assignments for delete to authenticated
  using ((select private.is_staff()));

-- ───────────── Events & appointments ─────────────
create table public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  starts_on date not null,
  ends_on date,
  location text,
  description text,
  published boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.events enable row level security;
create policy "Events: read published" on public.events for select to authenticated
  using (published or (select private.is_staff()));
create policy "Events: staff write" on public.events for all to authenticated
  using ((select private.is_staff())) with check ((select private.is_staff()));

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  starts_at timestamptz,
  position text not null,          -- e.g. Field, Boundary, Goal, Coach, Timekeeper
  venue text,                      -- field / ground
  match text,                      -- e.g. "Austin vs Denver"
  notes text,
  created_at timestamptz not null default now()
);
alter table public.appointments enable row level security;
create index on public.appointments (event_id);
create index on public.appointments (user_id);
create policy "Appointments: read own or staff" on public.appointments for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_staff()));
create policy "Appointments: staff write" on public.appointments for all to authenticated
  using ((select private.is_staff())) with check ((select private.is_staff()));

-- ───────────── Announcements ─────────────
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  audience public.user_role[],     -- null = everyone signed in
  pinned boolean not null default false,
  published_at timestamptz,        -- null = draft
  expires_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
alter table public.announcements enable row level security;
create index on public.announcements (created_by);
create policy "Announcements: read live for my role" on public.announcements for select to authenticated
  using (
    (select private.is_staff())
    or (published_at <= now()
        and (expires_at is null or expires_at > now())
        and (audience is null or (select private.my_role()) = any (audience)))
  );
create policy "Announcements: staff write" on public.announcements for all to authenticated
  using ((select private.is_staff())) with check ((select private.is_staff()));

-- ───────────── File storage ─────────────
-- avatars: public read; compliance-evidence: private (owner + staff). Files live under <user_id>/...
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('compliance-evidence', 'compliance-evidence', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

create policy "Avatars: upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Avatars: replace own" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Avatars: delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Evidence: read own or staff" on storage.objects for select to authenticated
  using (bucket_id = 'compliance-evidence'
         and ((storage.foldername(name))[1] = (select auth.uid())::text or (select private.is_staff())));
create policy "Evidence: upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'compliance-evidence' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Evidence: delete own or staff" on storage.objects for delete to authenticated
  using (bucket_id = 'compliance-evidence'
         and ((storage.foldername(name))[1] = (select auth.uid())::text or (select private.is_staff())));
