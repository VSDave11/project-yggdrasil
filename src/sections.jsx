// Large page sections
const { useEffect: _useEffect, useRef: _useRef, useState: _useState, useMemo: _useMemo } = React;

// --- Manifesto ---
function Manifesto() {
  return (
    <section id="manifesto" className="section manifesto">
      <div className="side">
        <div className="eyebrow">§ 01 · Manifesto</div>
        <div className="mono" style={{ marginTop: 16 }}>
          The world-tree of the<br/>Esims department.
        </div>
      </div>
      <div>
        <p>
          <span className="mark">Yggdrasil</span> is the AI and automation core the Esims department grew on top of — a single trunk that turns every trader's hardest repetitive problem into a <em>branch</em>.
        </p>
        <p>
          Six projects already on the tree. Drachir.gg live with 56 users, Kouzlo confirming six sports, Manual CockpitKiller retiring the cockpit's slowest flows, Automatic Prefill finishing forms before you reach for them.
        </p>
      </div>
    </section>
  );
}

// --- Architecture ---
function Architecture() {
  const W = 600, H = 600, cx = W/2, cy = H/2;
  const spokes = 6;
  const nodes = Array.from({ length: spokes }).map((_, i) => {
    const a = (i / spokes) * Math.PI * 2 - Math.PI / 2;
    return { x: cx + Math.cos(a) * 210, y: cy + Math.sin(a) * 210 };
  });
  return (
    <section id="architecture" className="section">
      <div className="eyebrow" style={{ marginBottom: 28 }}>§ 02 · Architecture</div>
      <div className="arch">
        <div className="arch-vis">
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
            <defs>
              <radialGradient id="arch-glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.4"/>
                <stop offset="70%" stopColor="var(--accent)" stopOpacity="0"/>
              </radialGradient>
            </defs>
            <circle cx={cx} cy={cy} r="210" fill="url(#arch-glow)"/>
            <circle cx={cx} cy={cy} r="210" fill="none" stroke="var(--rule)" strokeDasharray="1 4"/>
            <circle cx={cx} cy={cy} r="140" fill="none" stroke="var(--rule)" strokeDasharray="1 4" opacity="0.6"/>
            {nodes.map((n, i) => (
              <g key={i}>
                <line x1={cx} y1={cy} x2={n.x} y2={n.y} stroke="var(--accent)" strokeOpacity="0.55" strokeWidth="0.8"/>
                <circle cx={n.x} cy={n.y} r="5" fill="var(--accent)"/>
                <circle cx={n.x} cy={n.y} r="12" fill="none" stroke="var(--accent)" strokeOpacity="0.3">
                  <animate attributeName="r" values="6;16;6" dur="3s" begin={`${i*0.3}s`} repeatCount="indefinite"/>
                  <animate attributeName="opacity" values="0.5;0;0.5" dur="3s" begin={`${i*0.3}s`} repeatCount="indefinite"/>
                </circle>
              </g>
            ))}
            <circle cx={cx} cy={cy} r="36" fill="var(--bg-2)" stroke="var(--accent)"/>
            <text x={cx} y={cy+4} textAnchor="middle" className="tree-core-label">core</text>
            {/* orbiting particle */}
            <circle r="3" fill="var(--accent)">
              <animateMotion dur="8s" repeatCount="indefinite"
                path={`M ${cx+210},${cy} A 210,210 0 1,1 ${cx-210},${cy} A 210,210 0 1,1 ${cx+210},${cy}`}/>
            </circle>
          </svg>
        </div>
        <div className="arch-text">
          <h3 className="h-section"><em>One trunk.</em><br/>Many branches.</h3>
          <p className="lede" style={{ marginTop: 18 }}>
            Every project reaches into Yggdrasil for the same primitives — and gets to spend its time on what makes it different.
          </p>
          <div className="arch-steps">
            {[
              ["01", "Schedule",   "Drachir.gg powers shifts, coverage, and roster truth for the whole floor.", "Trading ops"],
              ["02", "Confirm",    "Kouzlo takes the manual out of confirming — one playbook per sport.", "Workflow"],
              ["03", "Prefill",    "Forms finish themselves. Traders only touch what's genuinely ambiguous.", "AI"],
              ["04", "Automate",   "Manual CockpitKiller quietly replaces the cockpit's slowest recurring flows.", "Automation"],
              ["05", "Validate",   "GSheet Validation keeps the upstream schedule data honest.", "Data"],
            ].map(([n, name, desc, tag]) => (
              <div key={n} className="arch-step">
                <div className="n">{n}</div>
                <div className="name">{name}</div>
                <div className="tag">{tag}</div>
                <div className="desc">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// --- Projects grid ---
function Projects({ fillers, density, onPick }) {
  const store = window.YGG_STORE.useStore();
  const projects = store.projects;
  const canEdit = true; // auth deferred

  const shown = [...projects];
  const fillerCount = Math.max(0, density - projects.length);
  for (let i = 0; i < fillerCount && i < fillers.length; i++) shown.push({ ...fillers[i], _ghost: true });

  const addBlank = async () => {
    try {
      const p = await store.addProject({
        name: 'New branch',
        tagline: 'click fields to edit',
        status: 'plan',
      });
      if (p?.code) onPick(p.code);
    } catch (e) { console.error(e); }
  };

  return (
    <section id="branches" className="section">
      <div className="projects-head">
        <div>
          <div className="eyebrow" style={{ marginBottom: 20 }}>§ 03 · The Branches</div>
          <h2 className="h-section">{projects.filter(p => p.status !== 'plan' && p.status !== 'beta').length} in production,<br/><em>more in the soil.</em></h2>
        </div>
        <div className="mono" style={{ textAlign: 'right' }}>
          <div>{projects.length} real branches</div>
          <div>{fillerCount} incubating</div>
          <div>{projects.length + fillerCount} total</div>
          {canEdit && (
            <button className="btn ghost" style={{ marginTop: 14 }} onClick={addBlank}>
              + New branch
            </button>
          )}
        </div>
      </div>
      <div className="projects-grid">
        {shown.map((p, i) => (
          p._ghost
            ? <GhostCard key={p.code} p={p}/>
            : <ProjectCard key={p.code} p={p} onClick={() => onPick(p.code)} store={store}/>
        ))}
      </div>
    </section>
  );
}

function ProjectCard({ p, onClick, store }) {
  const { EditableText, EditableStatus } = window.YGG_EDIT;
  const canEdit = true; // auth deferred
  const progress = window.YGG_STORE.deriveProgress(p);

  return (
    <div className="project-card" onClick={onClick} role="button" tabIndex={0}
         onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick()}>
      <div className="top">
        <div className="code">
          {p.code} · <EditableText
            value={p.tagline}
            onCommit={(v) => store.updateProject(p.code, { tagline: v })}
            placeholder="Tagline"
          />
        </div>
        <EditableStatus
          value={p.status}
          onCommit={(v) => store.updateProject(p.code, { status: v })}
        />
      </div>
      <div>
        <h3>
          <EditableText
            value={p.name}
            onCommit={(v) => store.updateProject(p.code, { name: v })}
            placeholder="Name"
          />
          {p.suffix && <em>{p.suffix}</em>}
        </h3>
        <div className="desc">
          <EditableText
            value={p.description}
            onCommit={(v) => store.updateProject(p.code, { description: v })}
            placeholder="Describe the branch"
          />
        </div>
      </div>
      {progress !== null && (
        <div className="card-progress">
          <div className="cp-bar"><div className="cp-fill" style={{ width: `${progress}%` }}/></div>
          <div className="cp-val">{progress}%</div>
        </div>
      )}
      <div className="bottom">
        <div className="metrics">
          {p.metrics.map((m, i) => (
            <div className="metric" key={i}>
              <div className="k">{m.k}</div>
              <div className="l">{m.l}</div>
            </div>
          ))}
        </div>
        <div className="arrow">↗</div>
      </div>
    </div>
  );
}

function GhostCard({ p }) {
  return (
    <div className="project-card ghost">
      <div className="top">
        <div className="code">{p.code} · Incubating</div>
        <div className={`status ${p.status}`}><span className="d"/>{window.YGG_DATA.STATUS_LABEL[p.status]}</div>
      </div>
      <div>
        <h3>{p.name}</h3>
        <div className="desc">A branch, still taking shape. Details as soon as the first shoot breaks soil.</div>
      </div>
      <div className="bottom">
        <div className="mono" style={{ opacity: 0.6 }}>—</div>
        <div className="arrow" style={{ color: 'var(--ink-faint)' }}>·</div>
      </div>
    </div>
  );
}

// --- Telemetry ---
function useTicker(ms = 1500) {
  const [t, setT] = _useState(0);
  _useEffect(() => {
    const id = setInterval(() => setT(x => x + 1), ms);
    return () => clearInterval(id);
  }, [ms]);
  return t;
}

function Sparkline({ seed = 1, up = true }) {
  const [pts, setPts] = _useState(() => {
    const n = 28; const r = []; let v = 50 + seed * 7;
    for (let i = 0; i < n; i++) { v += (Math.random() - 0.5) * 14; v = Math.max(10, Math.min(90, v)); r.push(v); }
    return r;
  });
  _useEffect(() => {
    const id = setInterval(() => {
      setPts(prev => {
        const v = prev[prev.length - 1] + (Math.random() - (up ? 0.4 : 0.6)) * 14;
        const clamped = Math.max(10, Math.min(90, v));
        return [...prev.slice(1), clamped];
      });
    }, 900 + seed * 130);
    return () => clearInterval(id);
  }, [seed, up]);
  const W = 200, H = 36;
  const step = W / (pts.length - 1);
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${i * step} ${H - (p / 100) * H}`).join(' ');
  const area = d + ` L ${W} ${H} L 0 ${H} Z`;
  return (
    <svg className="spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <path d={area} fill="var(--accent)" fillOpacity="0.12"/>
      <path d={d} fill="none" stroke="var(--accent)" strokeWidth="1"/>
    </svg>
  );
}

function Telemetry() {
  const seed = window.YGG_DATA.TELEMETRY_SEED;
  const [vals, setVals] = _useState(() => seed.map(s => s.v));
  useTicker(2200);
  _useEffect(() => {
    const id = setInterval(() => {
      setVals(prev => prev.map((v, i) => {
        if (i === 0) return String(54 + Math.floor(Math.random() * 5));       // active users
        if (i === 1) return "6";                                              // branches
        if (i === 2) return "6";                                              // sub-projects
        if (i === 3) return (270 + Math.floor(Math.random() * 30)).toLocaleString(); // workflows killed
        return v;
      }));
    }, 1800);
    return () => clearInterval(id);
  }, []);

  return (
    <section id="telemetry" className="telemetry">
      <div className="telemetry-inner">
        <div className="telemetry-head">
          <div>
            <div className="eyebrow" style={{ marginBottom: 20 }}>§ 04 · Live telemetry</div>
            <h2 className="h-section">The tree, <em>right now.</em></h2>
          </div>
          <div className="mono" style={{ textAlign: 'right' }}>
            <div style={{ color: 'var(--ok)'}}>● stream · live</div>
            <div>updated every 1.6s</div>
          </div>
        </div>
        <div className="telem-grid">
          {seed.map((s, i) => (
            <div className="telem-cell" key={i}>
              <div className="l">{s.l}</div>
              <div>
                <div className="v">{vals[i]}<span className="u">{s.u}</span></div>
                <Sparkline seed={i+1} up={i !== 0}/>
              </div>
              <div className="foot">
                <span>24h</span>
                <span className={`delta ${s.delta.startsWith('-') ? 'down' : ''}`}>{s.delta}</span>
              </div>
            </div>
          ))}
          <LogStream/>
        </div>
      </div>
    </section>
  );
}

function LogStream() {
  const lines = [
    ["drachir", "ok",   "shift loaded · user dkuchar · night coverage"],
    ["kouzlo",  "info", "FIFA · 60% · confirm playbook updated"],
    ["mck",     "ok",   "cockpit flow 17 · replaced · shadow → live"],
    ["prefill", "ok",   "form detected · 8 fields · 6 prefilled"],
    ["kouzlo",  "ok",   "CS2 Duels · 70% · confirm queue drained"],
    ["gsheet",  "info", "validation scan · schedule_2026_apr · clean"],
    ["drachir", "ok",   "roster sync · 56 active users"],
    ["kouzlo",  "warn", "Madden · edge case · trader review"],
    ["core",    "info", "branch YGG-04 · schedule-script · seeded"],
    ["prefill", "ok",   "pattern match · 50% accuracy · rolling"],
  ];
  const [cursor, setCursor] = _useState(0);
  _useEffect(() => {
    const id = setInterval(() => setCursor(c => (c + 1) % lines.length), 1400);
    return () => clearInterval(id);
  }, []);
  const rows = Array.from({ length: 6 }).map((_, i) => lines[(cursor + i) % lines.length]);
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return (
    <div className="log">
      {rows.map(([src, lvl, msg], i) => {
        const t = new Date(now.getTime() - i * 3200);
        return (
          <div className="row" key={i}>
            <span className="t">{pad(t.getHours())}:{pad(t.getMinutes())}:{pad(t.getSeconds())}</span>
            <span className={`lvl ${lvl}`}>{src}</span>
            <span>{msg}</span>
          </div>
        );
      })}
    </div>
  );
}

// --- Timeline ---
function Timeline() {
  return (
    <section id="timeline" className="section">
      <div className="eyebrow" style={{ marginBottom: 20 }}>§ 05 · Roots & canopy</div>
      <h2 className="h-section" style={{ marginBottom: 48 }}>
        The history of the tree, <em>ring by ring.</em>
      </h2>
      <div className="timeline">
        {window.YGG_DATA.TIMELINE.map((r, i) => (
          <div className="tl-row" key={i}>
            <div className="when">{r.when}</div>
            <div className="t">{r.t}</div>
            <div className="d">{r.d}</div>
            <div className="tag">{r.tag}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// --- Activity / audit log ---
function Activity() {
  const { audit } = window.YGG_STORE.useStore();
  const [expanded, setExpanded] = _useState(false);

  const items = expanded ? audit : audit.slice(0, 12);

  const fmtWhen = (ts) => {
    const d = new Date(ts);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) {
      return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) +
      ' · ' +
      d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  const fmtEntry = (e) => {
    if (e.kind === 'auth') {
      return <><strong>{e.name}</strong> {e.action}</>;
    }
    if (e.action === 'created') {
      return <><strong>{e.name}</strong> created <em>{e.targetName}</em></>;
    }
    if (e.action === 'deleted') {
      return <><strong>{e.name}</strong> deleted <em>{e.targetName}</em></>;
    }
    if (e.action === 'edited') {
      const from = e.from === '' || e.from == null ? '—' : String(e.from);
      const to   = e.to   === '' || e.to   == null ? '—' : String(e.to);
      return (
        <>
          <strong>{e.name}</strong> changed <em>{e.targetName}</em> <span className="a-field">· {e.field}</span>
          {' '}
          <span className="a-diff"><s>{String(from).slice(0, 60)}</s> → {String(to).slice(0, 60)}</span>
        </>
      );
    }
    return <><strong>{e.name}</strong> {e.action}</>;
  };

  return (
    <section id="activity" className="section">
      <div className="projects-head">
        <div>
          <div className="eyebrow" style={{ marginBottom: 20 }}>§ 06 · Activity</div>
          <h2 className="h-section">Every change, <em>on the record.</em></h2>
        </div>
        <div className="mono" style={{ textAlign: 'right' }}>
          <div>{audit.length} events</div>
          <div>live · local</div>
        </div>
      </div>
      {audit.length === 0 ? (
        <p className="lede" style={{ marginTop: 32, maxWidth: '60ch' }}>
          No activity yet. Sign in and tend the tree — every edit will land here.
        </p>
      ) : (
        <div className="activity-list">
          {items.map(e => (
            <div className="a-row" key={e.id}>
              <div className="a-when">{fmtWhen(e.ts)}</div>
              <div className="a-dot" data-kind={e.kind}/>
              <div className="a-text">{fmtEntry(e)}</div>
            </div>
          ))}
          {audit.length > items.length && (
            <button className="btn ghost" style={{ marginTop: 18 }} onClick={() => setExpanded(true)}>
              Show all {audit.length} events
            </button>
          )}
          {expanded && audit.length > 12 && (
            <button className="btn ghost" style={{ marginTop: 18 }} onClick={() => setExpanded(false)}>
              Collapse
            </button>
          )}
        </div>
      )}
    </section>
  );
}

// --- Team ---
function Team() {
  return (
    <section id="team" className="section">
      <div className="eyebrow" style={{ marginBottom: 20 }}>§ 06 · Keepers of the tree</div>
      <h2 className="h-section">Who tends <em>Yggdrasil.</em></h2>
      <div className="team-grid">
        {window.YGG_DATA.TEAM.map((t, i) => (
          <div className="team-cell" key={i}>
            <div>
              <div className="name">{t.name}</div>
              <div className="role">{t.role}</div>
            </div>
            <div className="initials">{t.initials}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// --- CTA ---
function CTA() {
  return (
    <section id="cta" className="cta">
      <div className="eyebrow" style={{ justifyContent: 'center', marginBottom: 28 }}>§ 07 · Graft a branch</div>
      <h2 className="h-display">
        Got a problem<br/>
        <em>worth a branch?</em>
      </h2>
      <p className="lede" style={{ margin: '32px auto 0', textAlign: 'center' }}>
        If a slice of your team's work looks like it belongs on the tree, the AI Core team wants to hear about it.
      </p>
      <div className="cta-row">
        <a className="btn primary" href="#">Request an intake <span className="a">→</span></a>
        <a className="btn" href="#">Read the core docs</a>
        <a className="btn" href="#">Subscribe to changelog</a>
      </div>
    </section>
  );
}

Object.assign(window, { Manifesto, Architecture, Projects, Telemetry, Timeline, Team, Activity, CTA });
