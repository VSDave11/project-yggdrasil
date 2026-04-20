const express = require('express');
const cors = require('cors');
const SEED = require('./seed-data');

const app = express();
const PORT = process.env.PORT || 3000;

// Anon key is safe to hardcode as a fallback — it only gives access the RLS
// policies allow. In prod, set SUPABASE_KEY via Render env to make rotation easy.
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tyjdelvkwqdzwinevrbo.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5amRlbHZrd3FkendpbmV2cmJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MDAxNzYsImV4cCI6MjA5MTM3NjE3Nn0.IfgVfmJL86Tyzg2qTLTbWYTJMfoi9m9xBNwJ2FZdit4';

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.static('public'));
app.use('/src', express.static('src'));

// ── Supabase REST helper ──
async function sb(path, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': options.prefer || 'return=representation',
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Supabase ${res.status}: ${body}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// Row <-> frontend project shape
const rowToProject = (row) => ({ ...(row.data || {}), code: row.code, _id: row.id });
const projectToRow = (p) => {
  const { code, _id, ...data } = p;
  return { code, data };
};

// ── SSE ──
const clients = new Set();
function broadcast(event, data) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const c of clients) { try { c.write(msg); } catch {} }
}

app.get('/api/events', async (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });
  // Prime the connection so proxies don't buffer.
  res.write(': connected\n\n');
  try {
    const rows = await sb('projects?order=id.asc');
    res.write(`event: init\ndata: ${JSON.stringify((rows || []).map(rowToProject))}\n\n`);
  } catch (e) {
    console.error('SSE init error:', e.message);
    res.write(`event: init\ndata: []\n\n`);
  }
  clients.add(res);
  console.log(`SSE client connected (${clients.size} total)`);
  const keepalive = setInterval(() => { try { res.write(': ping\n\n'); } catch {} }, 25000);
  req.on('close', () => {
    clearInterval(keepalive);
    clients.delete(res);
    console.log(`SSE client disconnected (${clients.size} total)`);
  });
});

// ── REST ──
app.get('/api/projects', async (req, res) => {
  try {
    const rows = await sb('projects?order=id.asc');
    res.json((rows || []).map(rowToProject));
  } catch (e) {
    console.error('GET /api/projects', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/projects', async (req, res) => {
  try {
    const p = req.body || {};
    if (!p.code) p.code = `YGG-${Date.now().toString(36).slice(-5).toUpperCase()}`;
    if (!p.name) p.name = 'New branch';
    if (!p.changelog) {
      p.changelog = [{ date: monthYear(), text: 'Project created' }];
    }
    const row = projectToRow(p);
    const inserted = await sb('projects', { method: 'POST', body: JSON.stringify(row) });
    const project = rowToProject(inserted[0]);
    broadcast('project-added', project);
    await logActivity('created', project.code, project.name, req.headers['x-user-name'], `New branch "${project.name}" added`);
    res.status(201).json(project);
  } catch (e) {
    console.error('POST /api/projects', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/projects/:code', async (req, res) => {
  try {
    const code = req.params.code;
    const incoming = req.body || {};
    // read current
    const existingRows = await sb(`projects?code=eq.${encodeURIComponent(code)}`);
    if (!existingRows || !existingRows[0]) return res.status(404).json({ error: 'Not found' });
    const current = rowToProject(existingRows[0]);
    const merged = { ...current, ...incoming, code }; // code is immutable via this route
    const { code: _c, _id: _id, ...data } = merged;
    const updated = await sb(`projects?code=eq.${encodeURIComponent(code)}`, {
      method: 'PATCH',
      body: JSON.stringify({ data, updated_at: new Date().toISOString() }),
    });
    const project = rowToProject(updated[0]);
    broadcast('project-updated', project);

    const details = diffSummary(current, merged);
    const userName = req.headers['x-user-name'] || 'Someone';
    for (const d of details) {
      await logActivity('updated', project.code, project.name, userName, d);
    }
    res.json(project);
  } catch (e) {
    console.error('PUT /api/projects/:code', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/projects/:code', async (req, res) => {
  try {
    const code = req.params.code;
    let name = code;
    try {
      const existing = await sb(`projects?code=eq.${encodeURIComponent(code)}`);
      if (existing && existing[0]) name = existing[0].data?.name || code;
    } catch {}
    await sb(`projects?code=eq.${encodeURIComponent(code)}`, { method: 'DELETE', prefer: 'return=minimal' });
    broadcast('project-deleted', { code });
    await logActivity('deleted', code, name, req.headers['x-user-name'], `Branch "${name}" removed`);
    res.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/projects/:code', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── Activity log ──
async function logActivity(action, project_code, project_name, user_name, detail) {
  try {
    const payload = {
      action,
      project_code: project_code || '',
      project_name: project_name || '',
      user_name: user_name || 'Someone',
      detail: detail || '',
    };
    await sb('activity_log', {
      method: 'POST',
      body: JSON.stringify(payload),
      prefer: 'return=minimal',
    });
    broadcast('activity', { ...payload, created_at: new Date().toISOString() });
  } catch (e) {
    console.error('logActivity', e.message);
  }
}

app.get('/api/activity', async (req, res) => {
  try {
    const rows = await sb('activity_log?order=created_at.desc&limit=30');
    res.json(rows || []);
  } catch (e) {
    console.error('GET /api/activity', e.message);
    res.json([]);
  }
});

// ── Helpers ──
function monthYear() {
  return new Date().toLocaleDateString('en', { month: 'short', year: 'numeric' });
}

function diffSummary(oldP, newP) {
  const out = [];
  const simpleFields = ['name', 'suffix', 'tagline', 'status', 'owners', 'since', 'stack', 'description'];
  for (const f of simpleFields) {
    if (oldP[f] !== newP[f] && newP[f] !== undefined) {
      out.push(`${f} updated`);
    }
  }
  if (JSON.stringify(oldP.metrics || []) !== JSON.stringify(newP.metrics || [])) out.push('Metrics updated');
  if (JSON.stringify(oldP.features || []) !== JSON.stringify(newP.features || [])) out.push('Features updated');
  const oldSubs = oldP.subprojects || [];
  const newSubs = newP.subprojects || [];
  if (newSubs.length > oldSubs.length) out.push(`Added sub-project`);
  else if (newSubs.length < oldSubs.length) out.push(`Removed a sub-project`);
  else if (JSON.stringify(oldSubs) !== JSON.stringify(newSubs)) out.push('Sub-projects updated');
  const oldLog = oldP.changelog || [];
  const newLog = newP.changelog || [];
  if (newLog.length > oldLog.length) {
    const newest = newLog[0];
    if (newest?.text) out.push(`Changelog: "${newest.text}"`);
  }
  if (!out.length) out.push('Updated');
  return out;
}

// ── Auto-seed on startup if DB is empty ──
async function autoSeed() {
  if (!SUPABASE_KEY) return;
  try {
    const rows = await sb('projects?select=id&limit=1');
    if (rows && rows.length) return;
    console.log('🌱 Empty projects table → seeding defaults');
    const payload = SEED.map(p => ({ code: p.code, data: (() => { const { code, ...rest } = p; return rest; })() }));
    await sb('projects', { method: 'POST', body: JSON.stringify(payload), prefer: 'return=minimal' });
    console.log(`🌱 Seeded ${payload.length} projects`);
  } catch (e) {
    console.error('autoSeed', e.message);
  }
}

app.listen(PORT, async () => {
  console.log(`🌳 Yggdrasil server running on port ${PORT}`);
  console.log(`   Supabase: ${SUPABASE_URL}`);
  await autoSeed();
});
