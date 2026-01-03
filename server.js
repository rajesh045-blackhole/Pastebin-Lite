import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'database.json');
const DATABASE_URL = process.env.DATABASE_URL;

// Trust Proxy for Cloud/Deployment environments (Heroku, Render, etc.)
app.set('trust proxy', 1);

// Middleware
app.use(cors()); // Enable CORS for development
app.use(express.json());

// Database Helper
const getDB = () => {
  if (!fs.existsSync(DB_FILE)) {
    return {};
  }
  try {
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return data ? JSON.parse(data) : {};
  } catch (e) {
    console.error('Error reading DB:', e);
    return {};
  }
};

const saveDB = (data) => {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Error writing DB:', e);
  }
};

// Initialize DB if not exists
if (!DATABASE_URL) {
  if (!fs.existsSync(DB_FILE)) {
    saveDB({});
  }
}

// Optional: Postgres setup (Neon) when DATABASE_URL is provided
let pool = null;
if (DATABASE_URL) {
  pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
  (async () => {
    try {
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
      console.log('[DB] Postgres ready');
    } catch (e) {
      console.error('[DB] Postgres init error:', e);
    }
  })();
}

// Helper: Get Current Time (supporting x-test-now-ms header)
const getNow = (req) => {
  const testTime = req.headers['x-test-now-ms'];
  if (testTime) {
    const timestamp = parseInt(testTime, 10);
    if (!isNaN(timestamp)) {
      console.log(`[Server] Using Test Time: ${new Date(timestamp).toISOString()}`);
      return new Date(timestamp);
    }
  }
  return new Date();
};

// API Routes

// Health Check
app.get('/api/healthz', (req, res) => {
  const dbExists = fs.existsSync(DB_FILE);
  res.json({ ok: true, storage: dbExists ? 'ready' : 'empty' });
});

// Create Paste
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

    if (pool) {
      (async () => {
        try {
          await pool.query(
            `insert into pastes (id, content, created_at, ttl_seconds, max_views, view_count, expire_at, title, language, password)
             values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
            [id, content, now.toISOString(), ttl_seconds || null, max_views || null, 0, expireAt, title || null, language || 'plaintext', password || null]
          );
          // Construct URL and return
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
      return; // response handled async
    } else {
      const db = getDB();
      const newPaste = {
        id,
        content,
        created_at: now.toISOString(),
        ttl_seconds: ttl_seconds || null,
        max_views: max_views || null,
        view_count: 0,
        expire_at: expireAt,
        title: title || null,
        language: language || 'plaintext',
        password: password || null
      };
      db[id] = newPaste;
      saveDB(db);
    }

    // Construct URL based on host or PUBLIC_BASE_URL
    // For HashRouter frontend, the link should include /#/
    const base = process.env.PUBLIC_BASE_URL;
    let url;
    if (base && typeof base === 'string' && base.trim()) {
      url = `${base.replace(/\/$/, '')}/#/p/${id}`;
    } else {
      const protocol = req.protocol;
      const host = req.get('host');
      url = `${protocol}://${host}/#/p/${id}`;
    }

    res.status(201).json({ id, url });
  } catch (error) {
    console.error('Create Paste Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get Paste
app.get('/api/pastes/:id', (req, res) => {
  try {
    const { id } = req.params;
    const password = req.query.password; 
    const now = getNow(req);

    if (pool) {
      (async () => {
        try {
          const { rows } = await pool.query('select * from pastes where id=$1', [id]);
          if (!rows.length) return res.status(404).json({ error: 'Paste not found' });
          const p = rows[0];

          // TTL/expiry
          if (p.expire_at && new Date(p.expire_at) <= now) {
            return res.status(404).json({ error: 'Paste expired' });
          }

          // Max views
          if (p.max_views !== null && p.view_count >= p.max_views) {
            return res.status(404).json({ error: 'View limit reached' });
          }

          // Password
          if (p.password && p.password !== password) {
            return res.status(403).json({ error: 'Password required', requires_password: true });
          }

          // Increment view
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
    } else {
      const db = getDB();
      const paste = db[id];
      if (!paste) {
        return res.status(404).json({ error: 'Paste not found' });
      }
      if (paste.expire_at && new Date(paste.expire_at) <= now) {
        return res.status(404).json({ error: 'Paste expired' });
      }
      if (paste.max_views !== null && paste.view_count >= paste.max_views) {
        return res.status(404).json({ error: 'View limit reached' });
      }
      if (paste.password && paste.password !== password) {
        return res.status(403).json({ error: 'Password required', requires_password: true });
      }
      paste.view_count += 1;
      saveDB(db);
      const remaining_views = paste.max_views !== null ? Math.max(0, paste.max_views - paste.view_count) : null;
      return res.json({
        content: paste.content,
        remaining_views,
        expires_at: paste.expire_at,
        created_at: paste.created_at,
        title: paste.title,
        language: paste.language,
        is_password_protected: !!paste.password
      });
    }
  } catch (error) {
    console.error('Get Paste Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Serve Static Frontend (must be after API routes)
app.use(express.static(path.join(__dirname, 'dist')));

// Fallback for SPA routing
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    const indexPath = path.join(__dirname, 'dist', 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send('Frontend build not found. Please run "npm run build" first.');
    }
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://localhost:${PORT}`);
});