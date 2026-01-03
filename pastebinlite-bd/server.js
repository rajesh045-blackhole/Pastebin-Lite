import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import path from 'path';
import { pool, initSchema } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;

export function createServer() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(cors());
  app.use(express.json());

  (async () => {
    try {
      await initSchema();
      console.log('[DB] Postgres ready');
    } catch (e) {
      console.error('[DB] Postgres init error:', e);
    }
  })();

  const getNow = (req) => {
    const testTime = req.headers['x-test-now-ms'];
    if (testTime) {
      const timestamp = parseInt(testTime, 10);
      if (!isNaN(timestamp)) return new Date(timestamp);
    }
    return new Date();
  };

  app.get('/api/healthz', async (req, res) => {
    try {
      await pool.query('select 1');
      res.json({ ok: true, db: 'ready' });
    } catch (e) {
      res.status(500).json({ ok: false, error: 'db_unavailable' });
    }
  });

  app.post('/api/pastes', (req, res) => {
    try {
      const { content, ttl_seconds, max_views, title, language, password } = req.body;
      if (!content || typeof content !== 'string' || !content.trim()) {
        return res.status(400).json({ error: 'Content is required' });
      }

      const id = Math.random().toString(36).substring(2, 10);
      const now = getNow(req);

      let expireAt = null;
      if (ttl_seconds && ttl_seconds > 0) {
        expireAt = new Date(now.getTime() + ttl_seconds * 1000).toISOString();
      }
      if (max_views && max_views < 1) {
        return res.status(400).json({ error: 'max_views must be >= 1' });
      }

      (async () => {
        try {
          await pool.query(
            `insert into pastes (id, content, created_at, ttl_seconds, max_views, view_count, expire_at, title, language, password)
             values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
            [id, content, now.toISOString(), ttl_seconds || null, max_views || null, 0, expireAt, title || null, language || 'plaintext', password || null]
          );
          const base = process.env.PUBLIC_BASE_URL;
          const protocol = req.protocol;
          const host = req.get('host');
          const url = base && base.trim() ? `${base.replace(/\/$/, '')}/#/p/${id}` : `${protocol}://${host}/#/p/${id}`;
          return res.status(201).json({ id, url });
        } catch (e) {
          console.error('Create Paste DB Error:', e);
          return res.status(500).json({ error: 'Internal Server Error' });
        }
      })();
      return;
    } catch (error) {
      console.error('Create Paste Error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.get('/api/pastes/:id', (req, res) => {
    try {
      const { id } = req.params;
      const password = req.query.password;
      const now = getNow(req);

      (async () => {
        try {
          const { rows } = await pool.query('select * from pastes where id=$1', [id]);
          if (!rows.length) return res.status(404).json({ error: 'Paste not found' });
          const p = rows[0];

          if (p.expire_at && new Date(p.expire_at) <= now) {
            return res.status(404).json({ error: 'Paste expired' });
          }
          if (p.max_views !== null && p.view_count >= p.max_views) {
            return res.status(404).json({ error: 'View limit reached' });
          }
          if (p.password && p.password !== password) {
            return res.status(403).json({ error: 'Password required', requires_password: true });
          }

          await pool.query('update pastes set view_count = view_count + 1 where id=$1', [id]);
          const newViewCount = (p.view_count || 0) + 1;
          const remaining_views = p.max_views !== null ? Math.max(0, p.max_views - newViewCount) : null;

          return res.json({
            content: p.content,
            remaining_views,
            expires_at: p.expire_at,
            created_at: p.created_at,
            title: p.title,
            language: p.language,
            is_password_protected: !!p.password
          });
        } catch (e) {
          console.error('Get Paste DB Error:', e);
          return res.status(500).json({ error: 'Internal Server Error' });
        }
      })();
      return;
    } catch (error) {
      console.error('Get Paste Error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  return app;
}

// Auto-start when not running in Vercel serverless
if (!process.env.VERCEL) {
  const app = createServer();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}
