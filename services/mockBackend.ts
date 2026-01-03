import { CreatePasteRequest, PasteResponse, ViewPasteResponse, Paste } from '../types';

// --- LocalStorage Fallback Implementation ---
const STORAGE_KEY = 'pastebin_lite_db';
const loadDB = (): Record<string, Paste> => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch { return {}; }
};
const saveDB = (db: Record<string, Paste>) => localStorage.setItem(STORAGE_KEY, JSON.stringify(db));

// --- API Implementation ---
const getTestHeaders = () => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const testTime = localStorage.getItem('x-test-now-ms');
  if (testTime) headers['x-test-now-ms'] = testTime;
  return headers;
};

// Check if Backend is available
let useBackend = false;
try {
  // Simple check logic, defaults to false initially in this sync context
  // Real check happens in calls
} catch (e) {}

export const createPaste = async (data: CreatePasteRequest): Promise<PasteResponse> => {
  try {
    const payload = {
      content: data.content,
      ttl_seconds: data.ttlSeconds,
      max_views: data.maxViews,
      title: data.title,
      language: data.language,
      password: data.password
    };

    const res = await fetch('/api/pastes', {
      method: 'POST',
      headers: getTestHeaders(),
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const json = await res.json();
      return { id: json.id, url: json.url, expireAt: null };
    }
  } catch (e) {
    console.warn("Backend unavailable, falling back to LocalStorage", e);
  }

  // Fallback: LocalStorage
  const db = loadDB();
  const id = Math.random().toString(36).substring(2, 10);
  const now = new Date();
  
  let expireAt: string | null = null;
  if (data.ttlSeconds) {
    expireAt = new Date(now.getTime() + data.ttlSeconds * 1000).toISOString();
  }

  db[id] = {
    id,
    content: data.content,
    createdAt: now.toISOString(),
    ttlSeconds: data.ttlSeconds,
    maxViews: data.maxViews,
    viewCount: 0,
    expireAt,
    title: data.title,
    language: data.language || 'plaintext',
    password: data.password
  };
  saveDB(db);

  return {
    id,
    url: `${window.location.origin}/p/${id}`,
    expireAt
  };
};

export const getPaste = async (id: string, password?: string): Promise<ViewPasteResponse> => {
  try {
    let url = `/api/pastes/${id}`;
    if (password) url += `?password=${encodeURIComponent(password)}`;
    
    const res = await fetch(url, { method: 'GET', headers: getTestHeaders() });
    
    if (res.ok) {
      const json = await res.json();
      return {
        content: json.content,
        remainingViews: json.remaining_views,
        expiresAt: json.expires_at,
        createdAt: json.created_at,
        title: json.title,
        language: json.language,
        isPasswordProtected: json.is_password_protected
      };
    } else if (res.status !== 404 && res.status !== 403) {
       // specific error that suggests connection issue?
    } else if (res.status === 403) {
      const json = await res.json();
      if (json.requires_password) {
        const err: any = new Error("Password required");
        err.requiresPassword = true;
        throw err;
      }
    }
  } catch (e: any) {
    if (e.requiresPassword) throw e;
    console.warn("Backend error or unavailable, checking LocalStorage", e);
  }

  // Fallback: LocalStorage
  const db = loadDB();
  const paste = db[id];
  if (!paste) throw new Error("Paste not found or expired");

  // Check TTL
  if (paste.expireAt && new Date(paste.expireAt) <= new Date()) {
     throw new Error("Paste not found or expired");
  }

  // Check Max Views
  if (paste.maxViews !== undefined && paste.maxViews !== null) {
    if (paste.viewCount >= paste.maxViews) {
      throw new Error("Paste not found or expired");
    }
  }

  // Check Password
  if (paste.password && paste.password !== password) {
    const err: any = new Error("Password required");
    err.requiresPassword = true;
    throw err;
  }

  // Increment View
  paste.viewCount += 1;
  saveDB(db);

  const remainingViews = paste.maxViews !== undefined && paste.maxViews !== null 
    ? Math.max(0, paste.maxViews - paste.viewCount) 
    : null;

  return {
    content: paste.content,
    remainingViews,
    expiresAt: paste.expireAt || null,
    createdAt: paste.createdAt,
    title: paste.title,
    language: paste.language,
    isPasswordProtected: !!paste.password
  };
};

export const checkHealth = async (): Promise<boolean> => {
  try {
    const res = await fetch('/api/healthz');
    return res.ok;
  } catch {
    return false;
  }
};
