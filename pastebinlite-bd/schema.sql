-- Neon/PostgreSQL schema for Pastebin-Lite

create table if not exists pastes (
  id text primary key,
  content text not null,
  created_at timestamptz not null default now(),
  ttl_seconds integer check (ttl_seconds >= 0),
  max_views integer check (max_views >= 1),
  view_count integer not null default 0,
  expire_at timestamptz,
  title text,
  language text,
  password text
);

-- Helpful indexes
create index if not exists idx_pastes_expire_at on pastes(expire_at) where expire_at is not null;
create index if not exists idx_pastes_created_at on pastes(created_at);
