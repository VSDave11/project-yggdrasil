-- ═══════════════════════════════════════════════════════════════
-- Yggdrasil — Auth & RLS migration
-- Paste into Supabase Dashboard → SQL Editor → Run
--
-- After this runs:
--   • Anyone (including anon) can SELECT projects + activity_log
--   • Only authenticated users with an @oddin.gg email can
--     INSERT / UPDATE / DELETE
-- ═══════════════════════════════════════════════════════════════

-- ── Enable RLS ──────────────────────────────────────────────────
alter table public.projects     enable row level security;
alter table public.activity_log enable row level security;

-- ── Drop any prior permissive policies (idempotent) ─────────────
drop policy if exists "projects_read_all"      on public.projects;
drop policy if exists "projects_write_oddin"   on public.projects;
drop policy if exists "projects_update_oddin"  on public.projects;
drop policy if exists "projects_delete_oddin"  on public.projects;

drop policy if exists "activity_read_all"      on public.activity_log;
drop policy if exists "activity_write_oddin"   on public.activity_log;

-- ── Helper: is current user an @oddin.gg user? ──────────────────
-- Supabase stores the verified email in auth.jwt() → 'email'
create or replace function public.is_oddin_user() returns boolean
language sql stable as $$
  select coalesce(
    (auth.jwt() ->> 'email') ilike '%@oddin.gg',
    false
  );
$$;

-- ── projects policies ───────────────────────────────────────────
create policy "projects_read_all"
  on public.projects for select
  using (true);

create policy "projects_write_oddin"
  on public.projects for insert
  with check (public.is_oddin_user());

create policy "projects_update_oddin"
  on public.projects for update
  using (public.is_oddin_user())
  with check (public.is_oddin_user());

create policy "projects_delete_oddin"
  on public.projects for delete
  using (public.is_oddin_user());

-- ── activity_log policies ──────────────────────────────────────
create policy "activity_read_all"
  on public.activity_log for select
  using (true);

create policy "activity_write_oddin"
  on public.activity_log for insert
  with check (public.is_oddin_user());
