// App root — store + auth + hero + sections + overlay
const { useEffect, useState } = React;

function Hero({ fillers, density, onPick, onCreate }) {
  const { projects } = window.YGG_STORE.useStore();
  return (
    <section id="top" className="hero">
      <div className="hero-copy">
        <div className="eyebrow">Projekt · Esims · Oddin.gg · AI & Automation core</div>
        <h1 className="hero-title">
          Yggdra<span className="slash">/</span>sil
        </h1>
        <p className="hero-sub">
          The world-tree our department grew on top of. A single trunk — and every project you see, a branch reaching out of it. {projects.length} live, more in the soil.
        </p>
      </div>
      <div className="hero-stage">
        <div className="tree-wrap">
          <YggTree projects={projects} fillers={fillers} density={density} onPick={onPick} onCreate={onCreate} />
        </div>
      </div>
      <div className="hero-foot">
        <div>Esims · Oddin.gg · AI & Automation</div>
        <div className="center">
          <span className="scroll-indicator">Scroll <span className="bar"></span></span>
        </div>
        <div className="right">Build · Apr 2026</div>
      </div>
    </section>);

}

function Nav({ onSignInClick }) {
  const { SessionChip } = window.YGG_AUTH;
  return (
    <nav className="nav">
      <div className="nav-mark">
        <span className="glyph" />
        <span>Project Yggdrasil</span>
      </div>
      <div className="nav-links">
        <a href="#manifesto">Manifesto</a>
        <a href="#architecture">Architecture</a>
        <a href="#branches">Branches</a>
        <a href="#activity">Activity</a>
        <a href="#timeline">Timeline</a>
      </div>
      <div className="nav-meta">
        <SessionChip onRequestAuth={onSignInClick} />
      </div>
    </nav>);

}

function AppInner() {
  const [tweaks, setTweaks] = useState(() => ({ ...window.YGG_TWEAKS }));
  const [tweaksActive, setTweaksActive] = useState(false);
  const [pickedCode, setPickedCode] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [newBranchOpen, setNewBranchOpen] = useState(false);

  const { FILLERS } = window.YGG_DATA;
  const { projects } = window.YGG_STORE.useStore();

  // Apply theme/accent/surface to root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', tweaks.theme);
    document.documentElement.setAttribute('data-accent', tweaks.accent);
    document.documentElement.setAttribute('data-surface', tweaks.surface || 'editorial');
  }, [tweaks.theme, tweaks.accent, tweaks.surface]);

  // Edit mode handshake
  useEffect(() => {
    const handler = (e) => {
      const d = e.data;
      if (!d || typeof d !== 'object') return;
      if (d.type === '__activate_edit_mode') setTweaksActive(true);
      if (d.type === '__deactivate_edit_mode') setTweaksActive(false);
    };
    window.addEventListener('message', handler);
    try {window.parent.postMessage({ type: '__edit_mode_available' }, '*');} catch (e) {}
    return () => window.removeEventListener('message', handler);
  }, []);

  // Tree picks: tree passes the *project index* from its internal nodes list.
  // Since the tree is fed the live `projects` array, index maps 1:1 for real projects.
  const onPickFromTree = (idx) => {
    if (idx < projects.length) setPickedCode(projects[idx].code);
  };

  const { AuthModal } = window.YGG_AUTH;
  const { NewBranchModal } = window.YGG_NEWBRANCH;

  return (
    <>
      <Nav onSignInClick={() => setAuthOpen(true)} />
      <Hero fillers={FILLERS} density={tweaks.density}
            onPick={onPickFromTree}
            onCreate={() => setNewBranchOpen(true)} />
      <hr className="rule" />
      <Manifesto />
      <hr className="rule" />
      <Architecture />
      <hr className="rule" />
      <Projects fillers={FILLERS} density={tweaks.density} onPick={(code) => setPickedCode(code)} />
      <Telemetry />
      <Timeline />
      <hr className="rule" />
      <Activity />
      <hr className="rule" />
      <Team />
      <hr className="rule" />
      <CTA />
      <footer className="footer">
        <div>© Esims · Oddin.gg · Projekt Yggdrasil</div>
        <div>Internal · Team only</div>
        <div>Apr 2026</div>
      </footer>
      <Overlay projectCode={pickedCode} onClose={() => setPickedCode(null)} />
      <Tweaks tweaks={tweaks} setTweaks={setTweaks} active={tweaksActive} onClose={() => setTweaksActive(false)} />
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      <NewBranchModal
        open={newBranchOpen}
        onClose={() => setNewBranchOpen(false)}
        onCreated={(p) => p?.code && setPickedCode(p.code)}
      />
    </>);

}

function App() {
  const { StoreProvider } = window.YGG_STORE;
  return <StoreProvider><AppInner /></StoreProvider>;
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);