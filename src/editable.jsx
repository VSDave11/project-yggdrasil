// Inline-editable field primitives. When signed in they show an edit affordance.
const { useState: __useState, useEffect: __useEffect, useRef: __useRef } = React;

function useCanEdit() {
  // Auth is deferred — everyone can edit until Google OAuth is wired up.
  return true;
}

// Simple text (single line)
function EditableText({ value, onCommit, placeholder, className = '', as: Tag = 'span', style }) {
  const canEdit = useCanEdit();
  const [editing, setEditing] = __useState(false);
  const [draft, setDraft] = __useState(value ?? '');

  __useEffect(() => { setDraft(value ?? ''); }, [value]);

  if (!canEdit) {
    return React.createElement(Tag, { className, style }, value || placeholder || '—');
  }
  if (!editing) {
    return React.createElement(
      Tag,
      {
        className: `editable ${className}`,
        style,
        onClick: (e) => { e.stopPropagation(); setEditing(true); },
        title: 'Click to edit',
      },
      value || React.createElement('span', { className: 'editable-empty' }, placeholder || 'Click to add')
    );
  }
  return (
    <input
      className={`editable-input ${className}`}
      style={style}
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => { setEditing(false); if (draft !== value) onCommit(draft); }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') { e.target.blur(); }
        if (e.key === 'Escape') { setDraft(value ?? ''); setEditing(false); }
      }}
      onClick={(e) => e.stopPropagation()}
    />
  );
}

// Multi-line text
function EditableTextarea({ value, onCommit, placeholder, className = '' }) {
  const canEdit = useCanEdit();
  const [editing, setEditing] = __useState(false);
  const [draft, setDraft] = __useState(value ?? '');
  __useEffect(() => { setDraft(value ?? ''); }, [value]);

  if (!canEdit) return <p className={className}>{value || placeholder || '—'}</p>;
  if (!editing) {
    return (
      <p
        className={`editable ${className}`}
        onClick={(e) => { e.stopPropagation(); setEditing(true); }}
        title="Click to edit"
      >
        {value || <span className="editable-empty">{placeholder || 'Click to add'}</span>}
      </p>
    );
  }
  return (
    <textarea
      className={`editable-input area ${className}`}
      autoFocus
      rows={3}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => { setEditing(false); if (draft !== value) onCommit(draft); }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') { setDraft(value ?? ''); setEditing(false); }
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.target.blur(); }
      }}
      onClick={(e) => e.stopPropagation()}
    />
  );
}

// Status select
const STATUS_OPTS = [
  { v: 'live',  l: 'Live' },
  { v: 'dev',   l: 'In development' },
  { v: 'plan',  l: 'Planned' },
  { v: 'beta',  l: 'Concept' },
];

function EditableStatus({ value, onCommit }) {
  const canEdit = useCanEdit();
  const label = window.YGG_DATA.STATUS_LABEL[value] || value;

  if (!canEdit) {
    return <div className={`status ${value}`}><span className="d"/>{label}</div>;
  }
  return (
    <select
      className={`status ${value} editable-select`}
      value={value}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => onCommit(e.target.value)}
    >
      {STATUS_OPTS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  );
}

// Progress slider (0–100)
function EditableProgress({ value, onCommit, label = 'progress' }) {
  const canEdit = useCanEdit();
  const v = Math.max(0, Math.min(100, Number(value) || 0));

  if (!canEdit) {
    return (
      <div className="prog-row">
        <div className="prog-label">{label}</div>
        <div className="prog-bar"><div className="prog-fill" style={{ width: `${v}%` }}/></div>
        <div className="prog-val">{v}%</div>
      </div>
    );
  }
  return (
    <div className="prog-row editing" onClick={(e) => e.stopPropagation()}>
      <div className="prog-label">{label}</div>
      <input
        type="range"
        min="0" max="100" step="5"
        value={v}
        onChange={(e) => onCommit(Number(e.target.value))}
        className="prog-slider"
      />
      <div className="prog-val">{v}%</div>
    </div>
  );
}

window.YGG_EDIT = { EditableText, EditableTextarea, EditableStatus, EditableProgress };
