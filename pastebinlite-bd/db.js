import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required');
}

export const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

export async function initSchema() {
  await pool.query(`
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
  `);

  // Indexes for efficient queries and cleanup
  await pool.query('create index if not exists idx_pastes_expire_at on pastes(expire_at) where expire_at is not null');
  await pool.query('create index if not exists idx_pastes_created_at on pastes(created_at)');
}
