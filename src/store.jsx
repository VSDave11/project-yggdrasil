// Central store: projects + auth + audit log, persisted to localStorage.
// All mutations go through actions so the audit log stays honest.

const LS = {
  projects: 'ygg.projects.v1',
  audit:    'ygg.audit.v1',
  session:  'ygg.session.v1',
  users:    'ygg.users.v1',
  deleted:  'ygg.deleted.v1',
};

function loadLS(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (e) { return fallback; }
}
function saveLS(key, v) {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) {}
}

// Generate a stable-ish id
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

// Humanise a user's email into a display name
function nameFromEmail(email) {
  const local = (email || '').split('@')[0] || '';
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map(s => s[0].toUpperCase() + s.slice(1))
    .join(' ') || email;
}

// ─────────────────────────────────────────────
// React context + hook
// ─────────────────────────────────────────────
const StoreCtx = React.createContext(null);

function StoreProvider({ children }) {
  // Projects: localStorage is truth; defaults fill in any never-seen codes
  // (so adding new seed projects later shows them without wiping user edits).
  const [projects, setProjects] = React.useState(() => {
    const saved = loadLS(LS.projects, null);
    const defaults = window.YGG_DATA.PROJECTS;
    const deleted = loadLS(LS.deleted, []); // codes the user explicitly removed
    if (!saved) {
      const seeded = defaults.map(p => ({ ...p }));
      saveLS(LS.projects, seeded);
      return seeded;
    }
    // Merge in any defaults whose code isn't present and wasn't deleted
    const seen = new Set(saved.map(p => p.code));
    const dead = new Set(deleted);
    const merged = [...saved];
    defaults.forEach(d => {
      if (!seen.has(d.code) && !dead.has(d.code)) merged.push({ ...d });
    });
    if (merged.length !== saved.length) saveLS(LS.projects, merged);
    return merged;
  });

  const [audit, setAudit] = React.useState(() => loadLS(LS.audit, []));
  const [session, setSession] = React.useState(() => loadLS(LS.session, null));

  // Persist on change
  React.useEffect(() => { saveLS(LS.projects, projects); }, [projects]);
  React.useEffect(() => { saveLS(LS.audit, audit); }, [audit]);
  React.useEffect(() => {
    if (session) saveLS(LS.session, session);
    else localStorage.removeItem(LS.session);
  }, [session]);

  // ── audit helper ──
  const log = React.useCallback((entry) => {
    const by = session ? session.email : 'system';
    const name = session ? session.name : 'System';
    setAudit(prev => [
      { id: uid(), ts: Date.now(), by, name, ...entry },
      ...prev,
    ].slice(0, 500));
  }, [session]);

  // ── AUTH ──
  // Identity-based sign-in. Called after a real OAuth flow (e.g. Google
  // Identity Services) yields a verified identity. In the interim, the
  // AuthModal calls this directly with a shared identity.
  const signInWithIdentity = ({ email, name, picture }) => {
    email = (email || '').trim().toLowerCase();
    if (!/^[^@\s]+@oddin\.gg$/.test(email)) {
      return { ok: false, msg: 'Only @oddin.gg Workspace accounts.' };
    }
    const s = {
      email,
      name: name || nameFromEmail(email),
      picture: picture || null,
    };
    setSession(s);
    setAudit(prev => [
      { id: uid(), ts: Date.now(), by: email, name: s.name, kind: 'auth', action: 'signed in' },
      ...prev,
    ].slice(0, 500));
    return { ok: true };
  };

  const signOut = () => {
    if (session) {
      setAudit(prev => [
        { id: uid(), ts: Date.now(), by: session.email, name: session.name, kind: 'auth', action: 'signed out' },
        ...prev,
      ].slice(0, 500));
    }
    setSession(null);
  };

  // ── PROJECT ACTIONS ──
  const updateProject = (code, patch) => {
    setProjects(prev => prev.map(p => {
      if (p.code !== code) return p;
      const next = { ...p, ...patch };
      Object.keys(patch).forEach(k => {
        log({
          kind: 'project',
          target: code,
          targetName: next.name,
          action: 'edited',
          field: k,
          from: p[k],
          to: patch[k],
        });
      });
      return next;
    }));
  };

  const addProject = (p) => {
    const code = p.code || `YGG-${String(Date.now()).slice(-4)}`;
    const full = {
      code,
      name: p.name || 'New project',
      suffix: p.suffix || '',
      tagline: p.tagline || '',
      status: p.status || 'plan',
      owners: p.owners || (session?.name || '—'),
      since: p.since || new Date().toLocaleDateString('en', { month: 'short', year: 'numeric' }),
      stack: p.stack || '—',
      description: p.description || '',
      features: p.features || [],
      metrics: p.metrics || [{ k: '0%', l: 'progress' }, { k: '—', l: 'users' }],
      changelog: [{ date: new Date().toLocaleDateString('en', { month: 'short', year: 'numeric' }), text: 'Project created' }],
      subprojects: p.subprojects || [],
    };
    setProjects(prev => [...prev, full]);
    log({ kind: 'project', target: code, targetName: full.name, action: 'created' });
    return full;
  };

  const deleteProject = (code) => {
    setProjects(prev => {
      const p = prev.find(x => x.code === code);
      if (p) log({ kind: 'project', target: code, targetName: p.name, action: 'deleted' });
      // remember the deletion so the default-merge doesn't resurrect it
      const dead = loadLS(LS.deleted, []);
      if (!dead.includes(code)) saveLS(LS.deleted, [...dead, code]);
      return prev.filter(x => x.code !== code);
    });
  };

  // ── SUBPROJECT ACTIONS ──
  const updateSub = (code, idx, patch) => {
    setProjects(prev => prev.map(p => {
      if (p.code !== code) return p;
      const subs = (p.subprojects || []).slice();
      const cur = subs[idx];
      if (!cur) return p;
      subs[idx] = { ...cur, ...patch };
      Object.keys(patch).forEach(k => {
        log({
          kind: 'sub',
          target: code,
          targetName: `${p.name} · ${cur.name}`,
          action: 'edited',
          field: k,
          from: cur[k],
          to: patch[k],
        });
      });
      return { ...p, subprojects: subs };
    }));
  };

  const addSub = (code, sub) => {
    setProjects(prev => prev.map(p => {
      if (p.code !== code) return p;
      const subs = [...(p.subprojects || []), {
        name: sub.name || 'New branch',
        progress: sub.progress ?? 0,
        owner: sub.owner || session?.name || '—',
        desc: sub.desc || '',
      }];
      log({ kind: 'sub', target: code, targetName: `${p.name} · ${subs.at(-1).name}`, action: 'created' });
      return { ...p, subprojects: subs };
    }));
  };

  const deleteSub = (code, idx) => {
    setProjects(prev => prev.map(p => {
      if (p.code !== code) return p;
      const subs = (p.subprojects || []).slice();
      const removed = subs.splice(idx, 1)[0];
      if (removed) log({ kind: 'sub', target: code, targetName: `${p.name} · ${removed.name}`, action: 'deleted' });
      return { ...p, subprojects: subs };
    }));
  };

  const value = {
    // state
    projects, audit, session,
    // auth
    signInWithIdentity, signOut,
    // project ops
    updateProject, addProject, deleteProject,
    // sub ops
    updateSub, addSub, deleteSub,
  };

  return React.createElement(StoreCtx.Provider, { value }, children);
}

function useStore() { return React.useContext(StoreCtx); }

// derived metrics for a project — re-derives live progress from subprojects if present
function deriveProgress(p) {
  if (p.subprojects && p.subprojects.length) {
    const avg = p.subprojects.reduce((s, x) => s + (Number(x.progress) || 0), 0) / p.subprojects.length;
    return Math.round(avg);
  }
  // pull from metrics if authored there
  const m = (p.metrics || []).find(x => /progress/i.test(x.l || ''));
  if (m) {
    const n = parseInt(String(m.k).replace(/[^\d]/g, ''), 10);
    if (!isNaN(n)) return n;
  }
  return null;
}

window.YGG_STORE = { StoreProvider, useStore, StoreCtx, deriveProgress, nameFromEmail };
