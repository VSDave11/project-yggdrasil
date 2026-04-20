// "New branch" modal — opens from the floating `?` phantoms in the tree,
// or from the "+ New branch" button. Creates a project via the store and
// hands the new code back so the app can open its overlay.
const { useState: _nbUseState, useEffect: _nbUseEffect, useRef: _nbUseRef } = React;

const STATUS_OPTIONS = [
  { value: 'plan', label: 'Planned'         },
  { value: 'beta', label: 'Concept'         },
  { value: 'dev',  label: 'In development'  },
  { value: 'live', label: 'Live'            },
];

function NewBranchModal({ open, onClose, onCreated }) {
  const store = window.YGG_STORE.useStore();
  const [name,    setName]    = _nbUseState('');
  const [tagline, setTagline] = _nbUseState('');
  const [status,  setStatus]  = _nbUseState('plan');
  const [owners,  setOwners]  = _nbUseState('');
  const [busy,    setBusy]    = _nbUseState(false);
  const [err,     setErr]     = _nbUseState('');
  const nameRef = _nbUseRef(null);

  _nbUseEffect(() => {
    if (!open) return;
    setName(''); setTagline(''); setStatus('plan'); setOwners('');
    setBusy(false); setErr('');
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const t = setTimeout(() => nameRef.current?.focus(), 50);
    return () => { window.removeEventListener('keydown', onKey); clearTimeout(t); };
  }, [open, onClose]);

  if (!open) return null;

  const submit = async (e) => {
    e?.preventDefault();
    if (busy) return;
    const n = name.trim();
    if (!n) { setErr('Name is required'); return; }
    setBusy(true); setErr('');
    try {
      const created = await store.addProject({
        name: n,
        tagline: tagline.trim() || 'click fields to edit',
        status,
        owners: owners.trim() || undefined,
      });
      onCreated && onCreated(created);
      onClose();
    } catch (e) {
      console.error(e);
      setErr('Could not create. Try again.');
      setBusy(false);
    }
  };

  return (
    <div className="nb-scrim" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <form className="nb-card" onSubmit={submit}>
        <div className="nb-eyebrow">New branch</div>
        <h3 className="nb-title">Plant a new <em>seed.</em></h3>
        <p className="nb-sub">
          Every branch starts as a question. Give it a name and it'll become a project everyone on the team can see.
        </p>

        <label className="nb-field">
          <span className="nb-label">Name</span>
          <input ref={nameRef} className="nb-input" value={name}
                 onChange={(e) => setName(e.target.value)}
                 placeholder="e.g. Heimdallr" maxLength={64} />
        </label>

        <label className="nb-field">
          <span className="nb-label">Tagline</span>
          <input className="nb-input" value={tagline}
                 onChange={(e) => setTagline(e.target.value)}
                 placeholder="one line about what it does" maxLength={120} />
        </label>

        <div className="nb-row">
          <label className="nb-field" style={{ flex: 1 }}>
            <span className="nb-label">Status</span>
            <select className="nb-input" value={status}
                    onChange={(e) => setStatus(e.target.value)}>
              {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </label>
          <label className="nb-field" style={{ flex: 1 }}>
            <span className="nb-label">Owner(s)</span>
            <input className="nb-input" value={owners}
                   onChange={(e) => setOwners(e.target.value)}
                   placeholder="who's driving it?" maxLength={80} />
          </label>
        </div>

        {err && <div className="nb-err">{err}</div>}

        <div className="nb-actions">
          <button type="button" className="nb-btn ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit"  className="nb-btn primary" disabled={busy}>
            {busy ? 'Planting…' : 'Create branch'}
          </button>
        </div>
      </form>
    </div>
  );
}

window.YGG_NEWBRANCH = { NewBranchModal };
