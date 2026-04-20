// Radial tree hero. Core in the middle, branches reaching to named projects.
// Animated growth on mount + idle pulse.
const { useEffect, useMemo, useRef, useState } = React;

function YggTree({ projects, fillers, density, onPick }) {
  // Combine real projects with fillers up to density
  const nodes = useMemo(() => {
    const all = [
      ...projects.map((p, i) => ({ ...p, real: true, idx: i })),
    ];
    const extras = Math.max(0, density - projects.length);
    for (let i = 0; i < extras && i < fillers.length; i++) {
      all.push({ ...fillers[i], real: false, idx: all.length });
    }
    return all;
  }, [projects, fillers, density]);

  const N = nodes.length;
  const W = 1280, H = 780;
  const cx = W / 2, cy = H * 0.22;

  // All branches fan DOWNWARD from core, filling the space below the title.
  const positions = useMemo(() => {
    return nodes.map((_, i) => {
      const span = Math.PI * 1.05; // ~190deg across the bottom
      const start = -Math.PI / 2 - span / 2 + Math.PI;
      const t = N === 1 ? 0.5 : i / (N - 1);
      const a = start + t * span;
      // Much bigger ellipse — fill the vertical space under the title
      const rx = 600, ry = 560;
      return {
        x: cx + Math.cos(a) * rx,
        y: cy + Math.abs(Math.sin(a)) * ry,
        angle: a,
      };
    });
  }, [N]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Branch path: smooth curve from core to node
  const branchPath = (p) => {
    const mx = cx + (p.x - cx) * 0.35;
    const my = cy + (p.y - cy) * 0.55;
    return `M ${cx} ${cy} Q ${mx} ${my} ${p.x} ${p.y}`;
  };

  // No roots — core sits near the top, branches fan down beneath it.
  const roots = [];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <defs>
        <radialGradient id="core-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.55" />
          <stop offset="60%" stopColor="var(--accent)" stopOpacity="0.08" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </radialGradient>
        <filter id="soft-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="4" />
        </filter>

        {/* ─── LIQUID GLASS DEFS (used in CSS by url() refs) ─── */}
        <radialGradient id="liquidNodeGrad" cx="35%" cy="30%" r="70%">
          <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="30%"  stopColor="var(--accent)" stopOpacity="0.6" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.08" />
        </radialGradient>
        <radialGradient id="liquidCoreGrad" cx="35%" cy="30%" r="75%">
          <stop offset="0%"   stopColor="#ffffff" stopOpacity="1" />
          <stop offset="22%"  stopColor="var(--accent)" stopOpacity="0.85" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.05" />
        </radialGradient>
      </defs>

      {/* ambient ring */}
      <g opacity={mounted ? 1 : 0} style={{ transition: "opacity 1.2s ease" }}>
        <circle cx={cx} cy={cy} r="380" fill="none" stroke="var(--rule)" strokeDasharray="1 6" />
        <circle cx={cx} cy={cy} r="260" fill="none" stroke="var(--rule)" strokeDasharray="1 4" opacity="0.6" />
      </g>

      {/* core glow */}
      <circle cx={cx} cy={cy} r="180" fill="url(#core-glow)">
        <animate attributeName="r" values="160;200;160" dur="6s" repeatCount="indefinite" />
      </circle>

      {/* roots (decorative) */}
      <g stroke="var(--rule)" strokeWidth="0.8" fill="none">
        {roots.map((d, i) => (
          <path key={i} d={d} opacity={mounted ? 0.8 : 0}
                style={{ transition: `opacity 1.4s ease ${0.3 + i * 0.08}s` }} />
        ))}
      </g>

      {/* branches */}
      <g fill="none">
        {nodes.map((n, i) => {
          const p = positions[i];
          const d = branchPath(p);
          const delay = 0.35 + i * 0.09;
          return (
            <g key={n.code}>
              <path
                d={d}
                stroke="var(--accent)"
                strokeOpacity={n.real ? 0.9 : 0.35}
                strokeWidth="0.9"
                strokeLinecap="round"
                style={{
                  strokeDasharray: 1400,
                  strokeDashoffset: mounted ? 0 : 1400,
                  transition: `stroke-dashoffset 1.5s cubic-bezier(.2,.8,.2,1) ${delay}s`,
                }}
              />
              {/* subtle glow trace */}
              <path
                d={d}
                stroke="var(--accent)"
                strokeOpacity={n.real ? 0.35 : 0}
                strokeWidth="2.8"
                filter="url(#soft-glow)"
                style={{
                  strokeDasharray: 1400,
                  strokeDashoffset: mounted ? 0 : 1400,
                  transition: `stroke-dashoffset 1.5s cubic-bezier(.2,.8,.2,1) ${delay}s`,
                }}
              />
            </g>
          );
        })}
      </g>

      {/* core node */}
      <g>
        <circle className="tree-core-orb" cx={cx} cy={cy} r="14" fill="var(--bg)" stroke="var(--accent)" strokeWidth="1.2" />
        <circle cx={cx} cy={cy} r="4" fill="var(--accent)">
          <animate attributeName="opacity" values="1;0.4;1" dur="3s" repeatCount="indefinite" />
        </circle>
        <circle cx={cx} cy={cy} r="28" fill="none" stroke="var(--accent)" strokeOpacity="0.3">
          <animate attributeName="r" values="18;40;18" dur="4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.5;0;0.5" dur="4s" repeatCount="indefinite" />
        </circle>
        <text x={cx} y={cy - 34} textAnchor="middle" className="tree-core-label">
          Yggdrasil · core
        </text>
      </g>

      {/* nodes + labels */}
      <g>
        {nodes.map((n, i) => {
          const p = positions[i];
          const delay = 0.35 + i * 0.09 + 1.1;
          const textAnchor = Math.abs(p.x - cx) < 40 ? "middle" : (p.x > cx ? "start" : "end");
          const lx = p.x + (textAnchor === "start" ? 14 : textAnchor === "end" ? -14 : 0);
          const ly = p.y + (p.y < cy ? -6 : 16);

          const interactive = n.real;
          return (
            <g key={n.code}
               className="tree-node-group"
               style={{ opacity: mounted ? 1 : 0, transition: `opacity .8s ease ${delay}s`, cursor: interactive ? 'pointer' : 'default' }}
               onClick={() => interactive && onPick(n.idx)}>
              <circle className="tree-node-pill" cx={p.x} cy={p.y} r={n.real ? 6 : 3.5}
                      fill={n.real ? "var(--accent)" : "var(--bg)"}
                      stroke="var(--accent)"
                      strokeWidth="1"
                      strokeOpacity={n.real ? 1 : 0.5}
              />
              {n.real && (
                <circle cx={p.x} cy={p.y} r="14"
                        fill="none" stroke="var(--accent)" strokeOpacity="0.3">
                  <animate attributeName="r" values="8;18;8" dur="3.4s" repeatCount="indefinite" begin={`${i * 0.4}s`} />
                  <animate attributeName="opacity" values="0.5;0;0.5" dur="3.4s" repeatCount="indefinite" begin={`${i * 0.4}s`} />
                </circle>
              )}
              <text x={lx} y={ly - 8} textAnchor={textAnchor} className="tree-node-code">
                {n.code}
              </text>
              <text x={lx} y={ly + 6} textAnchor={textAnchor}
                    className={`tree-node-label ${n.real ? "" : "dim"}`}>
                {n.name}{n.suffix || ""}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}

window.YggTree = YggTree;
