-- ============================================================
-- SBPM CMS — Supabase setup
-- Run this once in your Supabase project's SQL Editor
-- (Dashboard → SQL Editor → New query → paste all of this → Run)
-- ============================================================

-- One table per content type. Same shape for all four:
-- id, title, summary, body, status (draft/published), plus a
-- couple of type-specific fields, plus timestamps.

create table if not exists public.news (
  id text primary key,
  title text not null,
  summary text,
  body text,
  date text,
  status text not null default 'draft' check (status in ('draft','published')),
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tenders (
  id text primary key,
  title text not null,
  summary text,
  body text,
  closing_date text,
  status text not null default 'draft' check (status in ('draft','published')),
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.careers (
  id text primary key,
  title text not null,
  summary text,
  body text,
  location text,
  closing_date text,
  status text not null default 'draft' check (status in ('draft','published')),
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id text primary key,
  title text not null,
  summary text,
  body text,
  tag text,
  status text not null default 'draft' check (status in ('draft','published')),
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------
-- The public website (news.html, tenders.html, etc.) only ever
-- needs to READ rows where status = 'published'. The CMS needs
-- to read/write everything using the same public key (since this
-- is a PIN-gated app, not a real auth system) — so writes are
-- open to anyone holding your public key. This matches a small
-- single-client site; if that's ever a concern, this is the spot
-- to tighten later with Supabase Auth.

alter table public.news enable row level security;
alter table public.tenders enable row level security;
alter table public.careers enable row level security;
alter table public.projects enable row level security;

-- Public (anon) can read published rows only
create policy "public read published" on public.news
  for select to anon using (status = 'published');
create policy "public read published" on public.tenders
  for select to anon using (status = 'published');
create policy "public read published" on public.careers
  for select to anon using (status = 'published');
create policy "public read published" on public.projects
  for select to anon using (status = 'published');

-- CMS (also using the anon/public key) can read everything
-- including drafts, and can insert/update/delete
create policy "cms read all" on public.news
  for select to anon using (true);
create policy "cms write" on public.news
  for all to anon using (true) with check (true);

create policy "cms read all" on public.tenders
  for select to anon using (true);
create policy "cms write" on public.tenders
  for all to anon using (true) with check (true);

create policy "cms read all" on public.careers
  for select to anon using (true);
create policy "cms write" on public.careers
  for all to anon using (true) with check (true);

create policy "cms read all" on public.projects
  for select to anon using (true);
create policy "cms write" on public.projects
  for all to anon using (true) with check (true);

-- ------------------------------------------------------------
-- Done. Next: Project Settings → API → copy your Project URL
-- and public key into cms.html and the four site pages.
-- ------------------------------------------------------------
