// Project detail slide-in overlay — read-only when signed out, editable when signed in.
function Overlay({ projectCode, onClose }) {
  const store = window.YGG_STORE.useStore();
  const project = React.useMemo(
    () => store.projects.find(p => p.code === projectCode) || null,
    [store.projects, projectCode]
  );
  const [open, setOpen] = React.useState(false);
  const [confirmDel, setConfirmDel] = React.useState(false);

  React.useEffect(() => {
    if (project) {
      const id = requestAnimationFrame(() => setOpen(true));
      const onKey = (e) => e.key === 'Escape' && onClose();
      window.addEventListener('keydown', onKey);
      document.body.style.overflow = 'hidden';
      return () => {
        cancelAnimationFrame(id);
        window.removeEventListener('keydown', onKey);
        document.body.style.overflow = '';
      };
    } else {
      setOpen(false);
      setConfirmDel(false);
    }
  }, [project, onClose]);

  if (!project) return null;

  const canEdit = !!store.session;
  const { EditableText, EditableTextarea, EditableStatus, EditableProgress } = window.YGG_EDIT;
  const p = project;

  // Per-project audit history
  const projectAudit = store.audit.filter(
    e => (e.kind === 'project' || e.kind === 'sub') && e.target === p.code
  );

  const addSub = () => {
    store.addSub(p.code, {
      name: 'New branch',
      progress: 0,
      owner: store.session?.name || '—',
      desc: '',
    });
  };

  return (
    <div className={`overlay ${open ? 'open' : ''}`}>
      <div className="overlay-scrim" onClick={onClose}/>
      <aside className="overlay-panel">
        <div className="overlay-top">
          <div>
            <div className="mono" style={{ color: 'var(--accent)' }}>
              {p.code} · <EditableStatus
                value={p.status}
                onCommit={(v) => store.updateProject(p.code, { status: v })}
              />
            </div>
            <h2 style={{ marginTop: 8 }}>
              <EditableText
                value={p.name}
                onCommit={(v) => store.updateProject(p.code, { name: v })}
                placeholder="Name"
              />
              {p.suffix && <em>{p.suffix}</em>}
            </h2>
          </div>
          <button className="close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <p className="lede">
          <EditableText
            value={p.tagline}
            onCommit={(v) => store.updateProject(p.code, { tagline: v })}
            placeholder="One-line tagline"
          />.
        </p>

        <div className="ov-meta">
          <div>
            <div className="k">Owners</div>
            <div className="v">
              <EditableText
                value={p.owners}
                onCommit={(v) => store.updateProject(p.code, { owners: v })}
                placeholder="Who owns it"
              />
            </div>
          </div>
          <div>
            <div className="k">Since</div>
            <div className="v">
              <EditableText
                value={p.since}
                onCommit={(v) => store.updateProject(p.code, { since: v })}
                placeholder="e.g. Apr 2026"
              />
            </div>
          </div>
          <div>
            <div className="k">Stack</div>
            <div className="v">
              <EditableText
                value={p.stack}
                onCommit={(v) => store.updateProject(p.code, { stack: v })}
                placeholder="Stack / domain"
              />
            </div>
          </div>
          <div>
            <div className="k">Status</div>
            <div className="v">{window.YGG_DATA.STATUS_LABEL[p.status]}</div>
          </div>
        </div>

        <div className="ov-sect">
          <h4>What it is</h4>
          <EditableTextarea
            value={p.description}
            onCommit={(v) => store.updateProject(p.code, { description: v })}
            placeholder="Describe the project"
          />
        </div>

        {p.features && p.features.length > 0 && (
          <div className="ov-sect">
            <h4>What it does</h4>
            <ul className="ov-bullets">
              {p.features.map((f, i) => <li key={i}><span>{f}</span></li>)}
            </ul>
          </div>
        )}

        <div className="ov-sect">
          <h4>Right now</h4>
          <div className="ov-progress">
            <EditableProgress
              value={window.YGG_STORE.deriveProgress(p) ?? 0}
              label="overall progress"
              onCommit={(v) => {
                // If it has subprojects, progress is derived. Otherwise, store on first metric slot.
                if (p.subprojects && p.subprojects.length) return;
                const metrics = (p.metrics || []).slice();
                const idx = metrics.findIndex(m => /progress/i.test(m.l || ''));
                const next = { k: `${v}%`, l: 'progress' };
                if (idx >= 0) metrics[idx] = next;
                else metrics.unshift(next);
                store.updateProject(p.code, { metrics });
              }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 20 }}>
            {p.metrics.map((m, i) => (
              <div key={i}>
                <div style={{ fontFamily: 'var(--f-display)', fontWeight: 300, fontSize: 48, letterSpacing: '-0.02em', lineHeight: 1 }}>{m.k}</div>
                <div className="mono" style={{ marginTop: 6, textTransform: 'uppercase' }}>{m.l}</div>
              </div>
            ))}
          </div>
        </div>

        {((p.subprojects && p.subprojects.length > 0) || canEdit) && (
          <div className="ov-sect">
            <h4>
              Sub-branches
              {p.subprojects && p.subprojects.length > 0 && ` · ${p.subprojects.length}`}
            </h4>
            <div className="subprojects">
              {(p.subprojects || []).map((s, i) => (
                <div className="subproject" key={i}>
                  <div className="sp-head">
                    <div className="sp-name">
                      <EditableText
                        value={s.name}
                        onCommit={(v) => store.updateSub(p.code, i, { name: v })}
                      />
                    </div>
                    <div className="sp-pct">{s.progress}%</div>
                  </div>
                  <EditableProgress
                    value={s.progress}
                    label=""
                    onCommit={(v) => store.updateSub(p.code, i, { progress: v })}
                  />
                  <div className="sp-desc">
                    <EditableText
                      value={s.desc}
                      onCommit={(v) => store.updateSub(p.code, i, { desc: v })}
                      placeholder="Description"
                    />
                    {' · '}
                    <EditableText
                      value={s.owner}
                      onCommit={(v) => store.updateSub(p.code, i, { owner: v })}
                      placeholder="Owner"
                    />
                  </div>
                  {canEdit && (
                    <button
                      className="sp-del"
                      onClick={() => store.deleteSub(p.code, i)}
                      title="Delete sub-branch"
                    >×</button>
                  )}
                </div>
              ))}
              {canEdit && (
                <button className="btn ghost" onClick={addSub} style={{ marginTop: 4 }}>
                  + Add sub-branch
                </button>
              )}
            </div>
          </div>
        )}

        {(p.changelog && p.changelog.length > 0) && (
          <div className="ov-sect">
            <h4>Changelog</h4>
            <div className="changelog">
              {p.changelog.map((c, i) => (
                <div className="cl-row" key={i}>
                  <div className="cl-date">{c.date}</div>
                  <div className="cl-text">{c.text}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {projectAudit.length > 0 && (
          <div className="ov-sect">
            <h4>Recent edits</h4>
            <div className="ov-edits">
              {projectAudit.slice(0, 8).map(e => (
                <div className="ov-edit" key={e.id}>
                  <span className="ov-edit-when">
                    {new Date(e.ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                    {' · '}
                    {new Date(e.ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="ov-edit-body">
                    <strong>{e.name}</strong>{' '}
                    {e.action === 'edited' ? (
                      <>changed <em>{e.field}</em></>
                    ) : e.action}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="ov-sect" style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid var(--rule)', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {canEdit ? (
            confirmDel ? (
              <>
                <span style={{ color: 'var(--danger)', fontSize: 13 }}>Delete this branch permanently?</span>
                <button className="btn danger" onClick={() => { store.deleteProject(p.code); onClose(); }}>Yes, delete</button>
                <button className="btn" onClick={() => setConfirmDel(false)}>Cancel</button>
              </>
            ) : (
              <>
                <span className="mono" style={{ color: 'var(--ink-dim)', fontSize: 11 }}>
                  Click any field above to edit · changes auto-save
                </span>
                <div style={{ flex: 1 }}/>
                <button className="btn danger ghost" onClick={() => setConfirmDel(true)}>Delete branch</button>
              </>
            )
          ) : (
            <span className="mono" style={{ color: 'var(--ink-dim)', fontSize: 11 }}>
              Sign in to edit this branch.
            </span>
          )}
        </div>
      </aside>
    </div>
  );
}

window.Overlay = Overlay;
