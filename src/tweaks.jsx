// Tweaks panel (wired to host's edit mode)
function Tweaks({ tweaks, setTweaks, active, onClose }) {
  if (!active) return null;
  const ACCENTS = [
    ["cyan", "#7dd3fc"], ["violet", "#a78bfa"], ["green", "#34d399"],
    ["amber", "#f59e0b"], ["bone", "#f5f0d6"], ["red", "#ef4444"],
  ];
  const set = (patch) => {
    const next = { ...tweaks, ...patch };
    setTweaks(next);
    try {
      window.parent.postMessage({ type: '__edit_mode_set_keys', edits: patch }, '*');
    } catch (e) {}
  };
  return (
    <div className="tweaks-panel">
      <div className="tweaks-title">
        <span>Tweaks</span>
        <button onClick={onClose} style={{ color: 'var(--ink-dim)' }}>×</button>
      </div>
      <div className="tweaks-row">
        <label>Theme</label>
        <div className="seg">
          {["dark", "light"].map(t => (
            <button key={t} className={tweaks.theme === t ? 'active' : ''}
                    onClick={() => set({ theme: t })}>{t}</button>
          ))}
        </div>
      </div>
      <div className="tweaks-row">
        <label>Surface</label>
        <div className="seg">
          {[["editorial","Editorial"],["liquid","Liquid"]].map(([k,l]) => (
            <button key={k} className={(tweaks.surface||'editorial') === k ? 'active' : ''}
                    onClick={() => set({ surface: k })}>{l}</button>
          ))}
        </div>
      </div>
      <div className="tweaks-row">
        <label>Accent</label>
        <div className="swatches">
          {ACCENTS.map(([n, c]) => (
            <button key={n}
                    className={`swatch ${tweaks.accent === n ? 'active' : ''}`}
                    style={{ background: c }}
                    onClick={() => set({ accent: n })}
                    aria-label={n}/>
          ))}
        </div>
      </div>
      <div className="tweaks-row slider-row">
        <label>Branches · {tweaks.density}</label>
        <input type="range" min="4" max="8" step="1" value={tweaks.density}
               onChange={e => set({ density: parseInt(e.target.value, 10) })}/>
      </div>
    </div>
  );
}
window.Tweaks = Tweaks;
