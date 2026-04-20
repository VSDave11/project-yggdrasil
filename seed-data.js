// Default projects used to seed an empty Supabase on first boot.
// Shape matches frontend projects (stored as JSONB `data` in DB).
module.exports = [
  {
    code: "YGG-01", name: "Drachir", suffix: ".gg",
    tagline: "Oddin.gg schedule system",
    status: "live",
    metrics: [{ k: "56", l: "active users" }, { k: "100%", l: "progress" }],
    owners: "David Kuchař",
    stack: "Schedule engine · Trading shifts",
    since: "Feb 2026",
    description:
      "New Oddin.gg schedule system — shows your trading shifts, coverage windows, and a lot more. Full production rollout with 56 active users.",
    features: [
      "Personal shift schedule at a glance",
      "Night shifts, weekends, coverage windows",
      "Live-synced roster across the trading floor",
      "Integrations with the rest of the Yggdrasil tree",
    ],
    changelog: [
      { date: "Apr 2026", text: "Full production rollout — 56 active users" },
      { date: "Mar 2026", text: "Beta launch with initial team" },
      { date: "Feb 2026", text: "Project kickoff & architecture design" },
    ],
    subprojects: [],
  },
  {
    code: "YGG-02", name: "Manual", suffix: "CockpitKiller",
    tagline: "Kills repetitive ops workflows",
    status: "dev",
    metrics: [{ k: "80%", l: "progress" }, { k: "—", l: "users · internal" }],
    owners: "Matyáš Perský",
    stack: "UI automation · Workflow replacement",
    since: "Mar 2026",
    description:
      "Automated workflow replacement for the repetitive manual cockpit operations traders run every day. The point: stop clicking, start trading.",
    features: [
      "UI automation scripts for the cockpit's slowest flows",
      "Drop-in replacements for manual multi-step tasks",
      "Safe rollout — shadow before live",
      "Auditable paper trail behind every action",
    ],
    changelog: [
      { date: "Apr 2026", text: "UI automation scripts 80% complete" },
      { date: "Mar 2026", text: "Requirements & workflow mapping" },
    ],
    subprojects: [],
  },
  {
    code: "YGG-03", name: "Automatic", suffix: "Prefill",
    tagline: "AI-powered form prefill",
    status: "live",
    metrics: [{ k: "50%", l: "progress · live" }, { k: "AI", l: "pattern recognition" }],
    owners: "Ladislav Bánský",
    stack: "Pattern recognition · Form detection",
    since: "Mar 2026",
    description:
      "Smart form pre-filling engine using AI pattern recognition. Live with basic prefill logic; the harder cases are landing shipment by shipment.",
    features: [
      "Automatic form-field detection",
      "AI pattern matching across event types",
      "Live on a subset of flows · expanding",
      "Falls back to a human only on genuine ambiguity",
    ],
    changelog: [
      { date: "Apr 2026", text: "Live with basic prefill logic" },
      { date: "Mar 2026", text: "Form field detection prototype & AI pattern matching integration" },
    ],
    subprojects: [],
  },
  {
    code: "YGG-04", name: "Schedule", suffix: "Script",
    tagline: "Smarter shift scheduling",
    status: "plan",
    metrics: [{ k: "10%", l: "progress" }, { k: "R&D", l: "phase" }],
    owners: "David Kuchař",
    stack: "Scheduling · Heuristics",
    since: "Mar 2026",
    description:
      "Automated script for more accurate and comfortable trading shifts — so coverage is right and the roster doesn't have to be hand-tuned every week.",
    features: [
      "Coverage-aware shift generation",
      "Fairness constraints across the team",
      "Conflict detection against PTO and holidays",
      "Outputs straight into Drachir.gg",
    ],
    changelog: [
      { date: "Apr 2026", text: "Initial concept & research phase" },
      { date: "Mar 2026", text: "Project proposal submitted" },
    ],
    subprojects: [],
  },
  {
    code: "YGG-05", name: "GSheet", suffix: "Validation",
    tagline: "Live schedule data truth",
    status: "beta",
    metrics: [{ k: "5%", l: "progress" }, { k: "Concept", l: "phase" }],
    owners: "David Kuchař",
    stack: "Sheets · Validators",
    since: "Apr 2026",
    description:
      "Up-to-date schedule data — night shifts, weekends, and more — continuously validated so downstream tools always have a trustworthy source.",
    features: [
      "Schema validation across the schedule sheet",
      "Night shifts, weekends, and edge cases checked",
      "Error surfaces with actionable diffs",
      "Upstream source of truth for Drachir.gg",
    ],
    changelog: [
      { date: "Apr 2026", text: "Concept exploration & feasibility study" },
    ],
    subprojects: [],
  },
  {
    code: "YGG-06", name: "Kouzlo", suffix: "",
    tagline: "Automated confirm system",
    status: "dev",
    metrics: [{ k: "50%", l: "progress" }, { k: "6", l: "sports covered" }],
    owners: "Stanislav Uhlík",
    stack: "Confirm logic · Sport-specific",
    since: "Feb 2026",
    description:
      "Automated confirm system that lets traders focus on trading instead of confirming. One engine, one set of guardrails, one flow per sport.",
    features: [
      "Per-sport confirm workflows",
      "Traders kept in the loop, not in the grind",
      "Consistent behaviour across every market",
      "Room to add more sports without rewriting",
    ],
    changelog: [
      { date: "Apr 2026", text: "Confirmation logic 50% implemented" },
      { date: "Mar 2026", text: "API integration started" },
      { date: "Feb 2026", text: "System architecture defined" },
    ],
    subprojects: [
      { name: "FIFA",         progress: 60, owner: "Stanislav Uhlík", desc: "FIFA automated confirm workflow" },
      { name: "NBA",          progress: 45, owner: "Stanislav Uhlík", desc: "NBA automated confirm workflow" },
      { name: "Cricket",      progress: 30, owner: "Stanislav Uhlík", desc: "Cricket automated confirm workflow" },
      { name: "CS2 Duels",    progress: 70, owner: "Stanislav Uhlík", desc: "CS2 Duels automated confirm workflow" },
      { name: "Dota 2 Duels", progress: 55, owner: "Stanislav Uhlík", desc: "Dota 2 Duels automated confirm workflow" },
      { name: "Madden",       progress: 20, owner: "Stanislav Uhlík", desc: "Madden automated confirm workflow" },
    ],
  },
  {
    code: "YGG-07", name: "Kasandra", suffix: "",
    tagline: "click to describe",
    status: "plan",
    metrics: [{ k: "0%", l: "progress" }, { k: "—", l: "users" }],
    owners: "—",
    stack: "—",
    since: "Apr 2026",
    description: "",
    features: [],
    changelog: [
      { date: "Apr 2026", text: "Branch added to Yggdrasil" },
    ],
    subprojects: [],
  },
];
