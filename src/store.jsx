// Central store — hydrates from server via SSE, mutates via REST.
// Every client sees every change in near-real-time.

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

function nameFromEmail(email) {
  const local = (email || '').split('@')[0] || '';
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map(s => s[0].toUpperCase() + s.slice(1))
    .join(' ') || email;
}

function monthYear() {
  return new Date().toLocaleDateString('en', { month: 'short', year: 'numeric' });
}

const StoreCtx = React.createContext(null);

function StoreProvider({ children }) {
  const [projects, setProjects] = React.useState([]);
  const [audit,    setAudit]    = React.useState([]);
  const [session,  setSession]  = React.useState(() => {
    try { return JSON.parse(localStorage.getItem('ygg.session.v1')) || null; } catch { return null; }
  });
  const [ready,    setReady]    = React.useState(false);
  const [connOk,   setConnOk]   = React.useState(true);

  React.useEffect(() => {
    try {
      if (session) localStorage.setItem('ygg.session.v1', JSON.stringify(session));
      else localStorage.removeItem('ygg.session.v1');
    } catch {}
  }, [session]);

  // ── SSE: single channel for init + live project/activity events ──
  React.useEffect(() => {
    const es = new EventSource('/api/events');

    es.addEventListener('init', (e) => {
      try {
        const data = JSON.parse(e.data);
        setProjects(Array.isArray(data) ? data : []);
        setReady(true);
        setConnOk(true);
      } catch (err) { console.error('SSE init parse', err); }
    });

    es.addEventListener('project-added', (e) => {
      try {
        const p = JSON.parse(e.data);
        setProjects(prev => prev.some(x => x.code === p.code) ? prev : [...prev, p]);
      } catch {}
    });

    es.addEventListener('project-updated', (e) => {
      try {
        const p = JSON.parse(e.data);
        setProjects(prev => prev.map(x => x.code === p.code ? { ...x, ...p } : x));
      } catch {}
    });

    es.addEventListener('project-deleted', (e) => {
      try {
        const { code } = JSON.parse(e.data);
        setProjects(prev => prev.filter(x => x.code !== code));
      } catch {}
    });

    es.addEventListener('activity', (e) => {
      try {
        const a = JSON.parse(e.data);
        setAudit(prev => [{
          id: uid(),
          ts: Date.parse(a.created_at) || Date.now(),
          by: a.user_name,
          name: a.user_name,
          kind: 'project',
          target: a.project_code,
          targetName: a.project_name,
          action: a.action,
          detail: a.detail,
        }, ...prev].slice(0, 500));
      } catch {}
    });

    es.onerror = () => { setConnOk(false); /* EventSource auto-reconnects */ };

    return () => es.close();
  }, []);

  // ── HTTP helpers ──
  const headers = () => ({
    'Content-Type': 'application/json',
    ...(session?.name ? { 'x-user-name': session.name } : {}),
  });

  // ── AUTH (kept for future Google OAuth; currently in-memory + LS) ──
  const signInWithIdentity = ({ email, name, picture }) => {
    email = (email || '').trim().toLowerCase();
    if (!/^[^@\s]+@oddin\.gg$/.test(email)) {
      return { ok: false, msg: 'Only @oddin.gg Workspace accounts.' };
    }
    setSession({ email, name: name || nameFromEmail(email), picture: picture || null });
    return { ok: true };
  };
  const signOut = () => setSession(null);

  // ── PROJECT ACTIONS (server is source of truth, SSE rebroadcasts) ──
  const addProject = async (patch = {}) => {
    const body = {
      name: patch.name || 'New branch',
      suffix: patch.suffix || '',
      tagline: patch.tagline || 'click fields to edit',
      status: patch.status || 'plan',
      owners: patch.owners || session?.name || '—',
      since: patch.since || monthYear(),
      stack: patch.stack || '—',
      description: patch.description || '',
      features: patch.features || [],
      metrics: patch.metrics || [{ k: '0%', l: 'progress' }, { k: '—', l: 'users' }],
      changelog: patch.changelog || [{ date: monthYear(), text: 'Project created' }],
      subprojects: patch.subprojects || [],
    };
    if (patch.code) body.code = patch.code;
    const res = await fetch('/api/projects', {
      method: 'POST', headers: headers(), body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error('Create failed');
    const created = await res.json();
    // Optimistic add (SSE dedupes on code)
    setProjects(prev => prev.some(x => x.code === created.code) ? prev : [...prev, created]);
    return created;
  };

  const updateProject = async (code, patch) => {
    setProjects(prev => prev.map(p => p.code === code ? { ...p, ...patch } : p));
    try {
      await fetch(`/api/projects/${encodeURIComponent(code)}`, {
        method: 'PUT', headers: headers(), body: JSON.stringify(patch),
      });
    } catch (e) { console.error('updateProject', e); }
  };

  const deleteProject = async (code) => {
    setProjects(prev => prev.filter(p => p.code !== code));
    try {
      await fetch(`/api/projects/${encodeURIComponent(code)}`, {
        method: 'DELETE', headers: headers(),
      });
    } catch (e) { console.error('deleteProject', e); }
  };

  // ── SUBPROJECT ACTIONS (delegate to project update) ──
  const updateSub = async (code, idx, patch) => {
    const current = projects.find(p => p.code === code);
    if (!current) return;
    const subs = (current.subprojects || []).slice();
    if (!subs[idx]) return;
    subs[idx] = { ...subs[idx], ...patch };
    await updateProject(code, { subprojects: subs });
  };

  const addSub = async (code, sub) => {
    const current = projects.find(p => p.code === code);
    if (!current) return;
    const subs = [...(current.subprojects || []), {
      name:     sub.name     || 'New branch',
      progress: sub.progress ?? 0,
      owner:    sub.owner    || session?.name || '—',
      desc:     sub.desc     || '',
    }];
    await updateProject(code, { subprojects: subs });
  };

  const deleteSub = async (code, idx) => {
    const current = projects.find(p => p.code === code);
    if (!current) return;
    const subs = (current.subprojects || []).slice();
    subs.splice(idx, 1);
    await updateProject(code, { subprojects: subs });
  };

  const value = {
    // state
    projects, audit, session, ready, connOk,
    // auth
    signInWithIdentity, signOut,
    // projects
    addProject, updateProject, deleteProject,
    // subs
    addSub, updateSub, deleteSub,
  };

  return React.createElement(StoreCtx.Provider, { value }, children);
}

function useStore() { return React.useContext(StoreCtx); }

function deriveProgress(p) {
  if (p.subprojects && p.subprojects.length) {
    const avg = p.subprojects.reduce((s, x) => s + (Number(x.progress) || 0), 0) / p.subprojects.length;
    return Math.round(avg);
  }
  const m = (p.metrics || []).find(x => /progress/i.test(x.l || ''));
  if (m) {
    const n = parseInt(String(m.k).replace(/[^\d]/g, ''), 10);
    if (!isNaN(n)) return n;
  }
  return null;
}

window.YGG_STORE = { StoreProvider, useStore, StoreCtx, deriveProgress, nameFromEmail };
