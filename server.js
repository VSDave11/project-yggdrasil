const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Supabase config ──
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tyjdelvkwqdzwinevrbo.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5amRlbHZrd3FkendpbmV2cmJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MDAxNzYsImV4cCI6MjA5MTM3NjE3Nn0.IfgVfmJL86Tyzg2qTLTbWYTJMfoi9m9xBNwJ2FZdit4';

app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/src', express.static('src'));

// ── Supabase REST helper ──
async function supabase(path, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': options.prefer || 'return=representation',
      ...options.headers
    }
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase error: ${res.status} ${err}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// ── Map DB row to frontend format ──
function mapRow(row) {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    color: row.color,
    tag: row.tag,
    desc: row.description,
    progress: row.progress,
    users: row.users,
    team: row.team || ['Unassigned'],
    log: row.log || [],
    subprojects: row.subprojects || []
  };
}

// ── Map frontend format to DB row ──
function mapToRow(p) {
  const row = {};
  if (p.name !== undefined) row.name = p.name;
  if (p.icon !== undefined) row.icon = p.icon;
  if (p.color !== undefined) row.color = p.color;
  if (p.tag !== undefined) row.tag = p.tag;
  if (p.desc !== undefined) row.description = p.desc;
  if (p.progress !== undefined) row.progress = p.progress;
  if (p.users !== undefined) row.users = p.users;
  if (p.team !== undefined) row.team = p.team;
  if (p.log !== undefined) row.log = p.log;
  if (p.subprojects !== undefined) row.subprojects = p.subprojects;
  return row;
}

// ── SSE (Server-Sent Events) for real-time sync ──
const clients = new Set();

function broadcast(event, data) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  clients.forEach(res => res.write(msg));
}

app.get('/api/events', async (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  // Send current state
  try {
    const rows = await supabase('projects?order=id.asc');
    const projects = rows.map(mapRow);
    res.write(`event: init\ndata: ${JSON.stringify(projects)}\n\n`);
  } catch(e) {
    console.error('SSE init error:', e);
    res.write(`event: init\ndata: []\n\n`);
  }

  clients.add(res);
  console.log(`Client connected (${clients.size} total)`);

  req.on('close', () => {
    clients.delete(res);
    console.log(`Client disconnected (${clients.size} total)`);
  });
});

// ── REST API ──

// Get all projects
app.get('/api/projects', async (req, res) => {
  try {
    const rows = await supabase('projects?order=id.asc');
    res.json(rows.map(mapRow));
  } catch(e) {
    console.error('GET projects error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ── Activity Log ──
async function logActivity(action, project_name, user_name, detail) {
  try {
    await supabase('activity_log', {
      method: 'POST',
      body: JSON.stringify({ action, project_name: project_name || '', user_name: user_name || 'Someone', detail: detail || '' }),
      prefer: 'return=minimal'
    });
  } catch(e) { console.error('Activity log error:', e); }
}

// Get recent activity
app.get('/api/activity', async (req, res) => {
  try {
    const rows = await supabase('activity_log?order=created_at.desc&limit=30');
    res.json(rows);
  } catch(e) {
    console.error('GET activity error:', e);
    res.json([]);
  }
});

// Add a project
app.post('/api/projects', async (req, res) => {
  try {
    const { name, icon, color, tag, desc, team, subprojects } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const row = {
      name: name || 'Untitled',
      icon: icon || '🌱',
      color: color || 'green',
      tag: tag || 'Concept',
      description: desc || 'A new branch of Yggdrasil.',
      progress: 0,
      users: '—',
      team: team || ['Unassigned'],
      log: [{ date: new Date().toLocaleDateString('en', { month: 'short', year: 'numeric' }), text: 'Project created' }],
      subprojects: subprojects || []
    };

    const rows = await supabase('projects', {
      method: 'POST',
      body: JSON.stringify(row)
    });

    const project = mapRow(rows[0]);
    const userName = req.headers['x-user-name'] || (team && team[0]) || 'Someone';
    await logActivity('created', name, userName, `New project "${name}" added`);
    broadcast('project-added', project);
    broadcast('activity', { action: 'created', project_name: name, user_name: userName, detail: `New project "${name}" added`, created_at: new Date().toISOString() });
    res.status(201).json(project);
  } catch(e) {
    console.error('POST project error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Delete a project
app.delete('/api/projects/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    // Get name before deleting
    let projectName = 'Unknown';
    try {
      const existing = await supabase(`projects?id=eq.${id}`);
      if (existing && existing[0]) projectName = existing[0].name;
    } catch(e) {}

    await supabase(`projects?id=eq.${id}`, { method: 'DELETE' });
    const userName = req.headers['x-user-name'] || 'Someone';
    await logActivity('deleted', projectName, userName, `Project "${projectName}" removed`);
    broadcast('project-deleted', { id });
    broadcast('activity', { action: 'deleted', project_name: projectName, user_name: userName, detail: `Project "${projectName}" removed`, created_at: new Date().toISOString() });
    res.json({ success: true });
  } catch(e) {
    console.error('DELETE project error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Update a project
app.put('/api/projects/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    // Get old values for comparison
    let oldProject = null;
    try {
      const existing = await supabase(`projects?id=eq.${id}`);
      if (existing && existing[0]) oldProject = existing[0];
    } catch(e) {}

    const row = mapToRow(req.body);

    const rows = await supabase(`projects?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify(row)
    });

    const project = mapRow(rows[0]);
    const userName = req.headers['x-user-name'] || 'Someone';

    // Build detailed change list
    const details = [];
    const b = req.body;
    const o = oldProject || {};

    if (b.name !== undefined && b.name !== o.name) details.push(`Renamed to "${b.name}"`);
    if (b.icon !== undefined && b.icon !== o.icon) details.push(`Icon changed`);
    if (b.color !== undefined && b.color !== o.color) details.push(`Color → ${b.color}`);
    if (b.tag !== undefined && b.tag !== o.tag) details.push(`Status → "${b.tag}"`);
    if (b.desc !== undefined && b.desc !== o.description) details.push(`Description updated`);
    if (b.progress !== undefined && b.progress !== o.progress) details.push(`Progress ${o.progress||0}% → ${b.progress}%`);
    if (b.users !== undefined && b.users !== o.users) details.push(`Users → ${b.users}`);

    if (b.team) {
      const oldTeam = o.team || [];
      const newTeam = b.team || [];
      const added = newTeam.filter(t => !oldTeam.includes(t));
      const removed = oldTeam.filter(t => !newTeam.includes(t));
      if (added.length) details.push(`Added team: ${added.join(', ')}`);
      if (removed.length) details.push(`Removed team: ${removed.join(', ')}`);
      if (!added.length && !removed.length && JSON.stringify(oldTeam) !== JSON.stringify(newTeam)) details.push('Team updated');
    }

    if (b.log) {
      const oldLog = o.log || [];
      const newLog = b.log || [];
      if (newLog.length > oldLog.length) {
        const newest = newLog[0];
        details.push(`Changelog: "${newest.text}"${newest.author ? ' by ' + newest.author : ''}`);
      }
    }

    if (b.subprojects) {
      const oldSubs = o.subprojects || [];
      const newSubs = b.subprojects || [];
      if (newSubs.length > oldSubs.length) {
        const newest = newSubs[newSubs.length - 1];
        details.push(`Added sub-project "${newest.name}"`);
      } else if (newSubs.length < oldSubs.length) {
        details.push(`Removed a sub-project`);
      } else {
        // Find which sub changed
        for (let i = 0; i < newSubs.length; i++) {
          if (JSON.stringify(newSubs[i]) !== JSON.stringify(oldSubs[i])) {
            const s = newSubs[i];
            const os = oldSubs[i] || {};
            const subChanges = [];
            if (s.name !== os.name) subChanges.push(`name → "${s.name}"`);
            if (s.progress !== os.progress) subChanges.push(`${os.progress||0}% → ${s.progress}%`);
            if (s.owner !== os.owner) subChanges.push(`owner → ${s.owner}`);
            if (s.icon !== os.icon) subChanges.push(`icon changed`);
            if (s.desc !== os.desc) subChanges.push(`desc updated`);
            if (subChanges.length) {
              details.push(`Sub "${s.name}": ${subChanges.join(', ')}`);
            } else {
              details.push(`Sub "${s.name}" updated`);
            }
            break;
          }
        }
      }
    }

    if (!details.length) details.push('Updated');

    // Log each change as separate activity entry
    for (const detail of details) {
      await logActivity('updated', project.name, userName, detail);
      broadcast('activity', { action: 'updated', project_name: project.name, user_name: userName, detail, created_at: new Date().toISOString() });
    }

    broadcast('project-updated', project);
    res.json(project);
  } catch(e) {
    console.error('PUT project error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ── Start server ──
app.listen(PORT, () => {
  console.log(`🌳 Yggdrasil server running on port ${PORT}`);
  console.log(`   Supabase: ${SUPABASE_URL}`);
});
