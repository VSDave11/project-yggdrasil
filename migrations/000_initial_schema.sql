-- ═══════════════════════════════════════════════════════════════
-- Yggdrasil — Initial schema
-- Paste into Supabase Dashboard → SQL Editor → Run
--
-- Creates:
--   • projects      — project cards shown on the dashboard
--   • activity_log  — append-only log of changes for the feed
--
-- RLS is intentionally LEFT OFF so the anon key can read/write.
-- Auth + RLS comes later via migrations/001_auth_rls.sql.
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.projects (
  id           bigserial primary key,
  name         text   not null,
  icon         text   default '🌱',
  color        text   default 'green',
  tag          text   default 'Concept',
  description  text,
  progress     int    default 0,
  users        text   default '—',
  team         jsonb  default '["Unassigned"]'::jsonb,
  log          jsonb  default '[]'::jsonb,
  subprojects  jsonb  default '[]'::jsonb,
  created_at   timestamptz default now()
);

create table if not exists public.activity_log (
  id            bigserial primary key,
  action        text not null,
  project_name  text,
  user_name     text,
  detail        text,
  created_at    timestamptz default now()
);

create index if not exists activity_log_created_at_idx
  on public.activity_log (created_at desc);

-- Make sure the anon & authenticated roles can use these tables.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.projects     to anon, authenticated;
grant select, insert, update, delete on public.activity_log to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;
