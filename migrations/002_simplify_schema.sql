-- ═══════════════════════════════════════════════════════════════
-- Yggdrasil — Simplified schema (JSONB blob per project)
-- Paste into Supabase Dashboard → SQL Editor → Run
--
-- Replaces 000_initial_schema.sql. The old rigid columns diverged
-- from the frontend shape — we now store the full project object
-- as a JSONB blob with just `code` kept as a queryable column.
--
-- Safe to re-run: old tables are dropped (they held no real data).
-- Auto-seed of default projects happens on server startup.
-- ═══════════════════════════════════════════════════════════════

drop table if exists public.projects cascade;
drop table if exists public.activity_log cascade;

create table public.projects (
  id          bigserial primary key,
  code        text unique not null,
  data        jsonb not null,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create table public.activity_log (
  id            bigserial primary key,
  action        text not null,
  project_code  text,
  project_name  text,
  user_name     text,
  detail        text,
  created_at    timestamptz default now()
);

create index if not exists activity_log_created_at_idx
  on public.activity_log (created_at desc);

-- Anon access (auth deferred — locked down later via 001_auth_rls.sql)
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.projects     to anon, authenticated;
grant select, insert, update, delete on public.activity_log to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;
