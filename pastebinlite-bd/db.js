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
      ttl_seconds integer,
      max_views integer,
      view_count integer not null default 0,
      expire_at timestamptz,
      title text,
      language text,
      password text
    );
  `);
}
