# Pulse — Build Guide (Phase-by-Phase)

This document walks through how **Pulse** (the Developer Productivity
Dashboard MVP) is built, in the exact order you should build it during a
3-hour hackathon sprint.

Each phase is self-contained:
- **Goal** — what you're shipping in this phase
- **Files** — what you create or touch
- **Decisions** — the trade-offs locked in
- **Commands** — what to run
- **Verify** — how to confirm the phase is done before moving on
- **Time** — target budget; if you blow past it, simplify per the rules
  at the bottom of this doc

If you're following this for a fresh hackathon: do the phases **in order**.
Don't skip ahead. Each one assumes the previous is done.

---

## Phase 0 — Decisions & Setup (10 min)

**Goal**: lock the design choices that drive every later decision, so you
never re-litigate them mid-build.

### Decisions to make up-front

| Decision | Locked choice | Why |
| -------- | ------------- | --- |
| AI provider | Claude (Anthropic) with smart fallback | Real AI when key is present, demo-safe when not |
| Data source | Mock JSON only | Zero auth risk during demo |
| Auth | `localStorage` flag, no real OAuth | Avoid the OAuth rabbit hole |
| Deployment | Build local first; Vercel-ready | Demo doesn't depend on deploy |
| Persona | Generic "Alex Chen" | Believable but not tied to anyone real |
| Theme | Dark default + light toggle | Matches the brief's "premium dark UI" |
| Charts | 3 chart types + heatmap | Convincing without overscoping |
| Package mgr | npm | Universal, no extra install |

### Verify before moving on
- You have Node 20+ and npm installed: `node --version && npm --version`
- The working directory exists and is empty (or you're prepared to
  scaffold into it)
- Optional: you have an `ANTHROPIC_API_KEY` ready for Phase 9 (if not,
  the fallback path is just as polished)

---

## Phase 1 — Scaffold + Dependencies (15 min)

**Goal**: a working Next.js 16 app with all the UI dependencies installed
and a minimal shadcn-style design system in place.

### Files

- `app/layout.tsx` — root layout with the `ThemeProvider` wired in
- `app/globals.css` — Tailwind v4 + CSS variables for the dark/light
  theme tokens (background, foreground, card, muted, ring, chart-1..5,
  heat-0..4) and helper utilities (`.bg-grid`, `.glow`, `.scrollbar-thin`,
  `.animate-shimmer`)
- `components.json` — shadcn config (slate base, new-york style)
- `components/theme-provider.tsx` — thin wrapper around `next-themes`
- `components/ui/*` — minimal shadcn primitives: `button`, `card`,
  `badge`, `avatar`, `skeleton`, `dropdown-menu`, `tooltip`,
  `scroll-area`, `separator`, `input`
- `lib/utils.ts` — `cn()` helper combining `clsx` + `tailwind-merge`

### Commands

```bash
npx create-next-app@latest . \
  --typescript --tailwind --app --no-src-dir \
  --import-alias "@/*" --use-npm --eslint --yes --turbopack

npm install recharts framer-motion next-themes date-fns lucide-react \
  @anthropic-ai/sdk clsx tailwind-merge class-variance-authority \
  @radix-ui/react-slot @radix-ui/react-avatar @radix-ui/react-dropdown-menu \
  @radix-ui/react-tooltip @radix-ui/react-scroll-area @radix-ui/react-dialog \
  @radix-ui/react-separator
```

### Key decision

We write shadcn primitives **by hand** rather than running
`npx shadcn add`. The interactive CLI prompt eats time in a hackathon
and we only need a handful of primitives — writing them directly is
faster and the code is identical.

### Verify
- `npm run build` succeeds with **zero TypeScript errors**
- `npm run dev` boots without warnings
- Visiting `http://localhost:3000` shows *something* (anything — the
  scaffolded page is fine)

---

## Phase 2 — Mock Data Layer (15 min)

**Goal**: every screen we build later just imports from `/mock`. No
network calls, no API plumbing, no surprises during the demo.

### Files

| File | What it has |
|------|-------------|
| `mock/user.ts` | `currentUser` — Alex Chen profile (name, role, avatar gradient) |
| `mock/repos.ts` | `repos` — 6 believable repos with language, stars, forks, weekly commits |
| `mock/team.ts` | `team` — 5 teammates with commits, PRs merged, reviews, deltas |
| `mock/timeseries.ts` | `commitsLast30Days`, `prIssueWeekly`, `languageBreakdown`, `sparklines` |
| `mock/activity.ts` | `activity` — 31 timeline events across commits/PRs/issues/reviews |
| `mock/heatmap.ts` | `generateHeatmap()` — deterministic 365-day generator with weekday/recency weighting |
| `mock/metrics.ts` | `metrics` — the 5 hero metric cards with sparkline data and color tokens |
| `mock/insights-fallback.ts` | `fallbackInsights`, `pickInsights()` — the AI fallback pool |

### Key decisions

- **Seeded RNG** (`seededRandom(seed)` in `timeseries.ts` and
  `heatmap.ts`). Every render produces the same data → no demo-day
  surprises. A different person showing the demo sees the same numbers.
- **Realistic curves, not flat lines**: commits use a `base + trend + noise`
  formula with weekday/weekend weighting; the heatmap uses a recency
  boost + mid-year dip. Looks alive.
- **No timestamps from `new Date()`** — everything is anchored to a fixed
  demo date (`2026-05-25`) so the dashboard never goes stale.

### Verify
- Import `commitsLast30Days` and `console.log` it — should see 30 entries,
  weekday values higher than weekend values
- The team and activity arrays should have at least 5 and 30 entries
  respectively
- Heatmap: `heatmapCells.length` should be ~365 ± 7

---

## Phase 3 — Layout Shell (15 min)

**Goal**: the persistent dashboard chrome — sidebar + topbar + theme
toggle. Every dashboard widget renders inside this.

### Files

- `components/layout/sidebar.tsx` — collapsible vertical nav (Overview,
  Repositories, Activity, Team, AI Insights, Settings, Help). Has a
  collapse/expand button on the right side of the brand row.
- `components/layout/topbar.tsx` — search input with ⌘K hint, "New"
  button, notifications bell with a red dot, theme toggle, avatar
  dropdown with the sign-out action.
- `components/layout/theme-toggle.tsx` — sun/moon icon that
  cross-fades on theme switch. Mounted-guard pattern to avoid
  hydration mismatches.

### Key decisions

- **Sidebar collapses, doesn't disappear** on desktop (mobile drawer is
  optional polish in Phase 10). Saves time and looks intentional.
- **Topbar `sticky top-0`** with `bg-background/70 backdrop-blur-xl`
  for the glassy modern feel.
- **Theme toggle uses absolute-positioned icons** with rotation +
  opacity transitions. Simpler than two stacked buttons.

### Verify
- The sidebar renders on the left with 7 nav items
- The topbar has search, theme toggle, and avatar dropdown
- Clicking the theme toggle flips the entire UI smoothly

---

## Phase 4 — Mock Auth (10 min)

**Goal**: a polished login screen that gates the dashboard. Zero real
auth code.

### Files

- `lib/auth.ts` — `signIn()`, `signOut()`, `isAuthed()`, plus three
  hooks: `useAuth`, `useRequireAuth`, `useRedirectIfAuthed`. The hooks
  sync to a custom `devdash:auth` window event so multiple components
  re-render in lock-step.
- `components/auth/login-card.tsx` — the actual login card UI:
  gradient blurs, the brand chip, "Continue with GitHub" button (which
  shows a 650ms spinner before redirecting), and three small
  feature-preview chips.
- `app/page.tsx` — landing page (just renders `<LoginCard />` over a
  grid-pattern background)
- `components/dashboard/auth-guard.tsx` — client wrapper used by the
  dashboard page; shows a loading spinner during the SSR/client
  reconciliation, then redirects unauth'd users to `/`.

### Key decisions

- **Synthetic delay** on sign-in. Without it, the redirect feels
  glitchy. 650ms is enough to read the "Signing in…" spinner.
- **No middleware**. Auth runs entirely client-side via the
  `AuthGuard` component on the dashboard page. Faster, simpler, and
  for a localStorage-based session there's nothing the server could
  validate anyway.

### Verify
- Visit `/` → see login card
- Click "Continue with GitHub" → spinner → land on `/dashboard`
- Click avatar → "Sign out" → bounce back to `/`
- Visit `/dashboard` while logged out → bounce to `/`

---

## Phase 5 — Metric Cards (15 min)

**Goal**: the five hero KPI cards that anchor the top of the dashboard.

### Files

- `components/dashboard/metric-card.tsx` — one reusable component,
  used five times.

### Key decisions

- **One component for all five**, driven by `mock/metrics.ts`. Adding
  a sixth card later is a 5-line data change.
- **Sparkline colors are explicit hex** (`sparkColor: "#a78bfa"`), not
  Tailwind class names. Recharts strokes don't inherit
  Tailwind-class-based colors through wrapper divs — explicit hex is
  more reliable.
- **Trend chip logic understands "good vs bad"**: for "Open Issues" a
  down-trend is good (green), for "Commits" an up-trend is good. The
  metric's `good: "up" | "down"` field drives the color.
- **Animation**: `framer-motion` stagger (`delay: index * 0.05`) so
  cards cascade in. Hover lifts the card 2px.

### Verify
- 5 cards render side-by-side on desktop, stack on mobile
- Each card has icon, label, value, sub-label, trend chip, sparkline
- Issues card shows a **green** down-trend chip (because down is good)
- Hover any card → it lifts 2px

---

## Phase 6 — Charts (25 min)

**Goal**: three Recharts-powered visualizations that make the dashboard
feel like a real analytics product.

### Files

- `components/dashboard/chart-card.tsx` — shared frame: title, optional
  subtitle, optional toolbar slot, motion fade-in.
- `components/dashboard/commits-chart.tsx` — 30-day area chart with
  gradient fill, custom tooltip, and a decorative 7d/30d/90d toggle.
- `components/dashboard/pr-issue-chart.tsx` — 12-week stacked bar
  chart (PRs blue, issues amber) with custom legend.
- `components/dashboard/language-donut.tsx` — donut with center label
  ("TS · 42%") and a side legend with percentages.

### Key decisions

- **Custom tooltips for every chart**. Recharts' default tooltip looks
  generic — five lines of custom JSX makes the dashboard feel
  hand-crafted.
- **CSS variables for chart colors** (`hsl(var(--chart-1))` etc.) so
  charts re-color automatically when the user toggles light mode.
- **`ResponsiveContainer`** with fixed height containers — charts
  shrink with the page but never collapse to 0.
- **`isAnimationActive={false}` on sparklines** — the metric-card
  sparklines are decorative and animating them caused jitter during the
  card-stagger reveal.

### Verify
- Hover the area chart → tooltip shows date + commit count
- Stacked bars stack correctly (PRs on bottom, issues on top)
- Donut renders six slices, center shows "TS · 42%"

---

## Phase 7 — Heatmap (20 min)

**Goal**: the GitHub-style 52-week contribution heatmap.

### Files

- `components/dashboard/heatmap.tsx` — pure-CSS grid implementation,
  no chart library.

### Key decisions

- **Column-major layout**: each week is a vertical stack of 7
  `h-2.5 w-2.5` squares; weeks sit horizontally. Matches GitHub's
  layout exactly.
- **Theme-aware color scale**: 5 levels (`heat-0` through `heat-4`) are
  CSS variables, so the heatmap looks correct in both dark (deep
  emerald scale) and light (pale → strong emerald) modes.
- **Tooltip per cell**, but using shadcn's `<Tooltip>` (Radix
  primitive) — keyboard-accessible, dismisses correctly, no z-index
  fights.
- **Month labels via per-week first-cell month-change detection**.
  Simpler than computing absolute positions.
- **Horizontal scroll on narrow screens** rather than re-flowing the
  grid. The grid has to read left-to-right or it stops looking like a
  heatmap.

### Verify
- ~365 cells render in a 7-row grid
- Hovering a cell shows "{n} contributions on {weekday, date}"
- Mon/Wed/Fri labels appear on the left
- Month labels (Jun, Jul…) appear across the top
- Legend "Less / 5 squares / More" appears top-right

---

## Phase 8 — Timeline, Leaderboard, Repos (20 min)

**Goal**: the three "social" widgets — what your team did, who shipped
most, and where the work is happening.

### Files

- `components/dashboard/activity-feed.tsx` — 31-event scrollable
  timeline with a connecting line, per-event icon (commit, PR opened,
  PR merged, issue opened, issue closed, review), and per-event
  badge color (violet/sky/emerald/amber/rose).
- `components/dashboard/leaderboard.tsx` — sorted team ranking with
  animated bar fills (Framer Motion `width: 0 → pct%`), delta arrows,
  gold styling for the top entry.
- `components/dashboard/repo-list.tsx` — compact divider-separated
  list with language dot, stars, forks, and weekly commit count.

### Key decisions

- **Activity timeline uses a vertical connector line** (`absolute
  left-[14px] top-1 bottom-1 w-px bg-border`) — instantly conveys
  "feed" without any extra components.
- **Live indicator with pulse**: a green dot with a `ping`-animated
  outer halo on the timeline header. Sells the "realtime" feel.
- **Leaderboard bar widths are animated**, not static. The eye notices.

### Verify
- Activity feed scrolls (set to `h-[560px]`) with 31 events
- Top leaderboard entry has gold/amber styling and `#1` rank chip
- Repo list shows all 6 repos with their language dots

---

## Phase 9 — AI Insights (25 min) — *most demo-critical*

**Goal**: the panel that proves "AI integration". Must work whether or
not an API key is configured.

### Files

- `lib/ai.ts` — `generateInsights(stats)`:
  1. Read `process.env.ANTHROPIC_API_KEY`
  2. If absent or default → return `pickInsights()` from the fallback
     pool with `source: "mock"`
  3. Otherwise call `claude-sonnet-4-6` with a strict system prompt
     demanding `{ insights: [{ category, title, body }] }`
  4. Parse the JSON (with code-fence stripping). Validate.
  5. On *any* failure → also fall back to mock insights
  6. Return `{ insights, source: "ai" | "mock" }`
- `app/api/insights/route.ts` — POST endpoint, default stats payload,
  no-cache headers.
- `components/dashboard/insights-panel.tsx` — client component:
  - Fetches on mount
  - Shows 4 skeleton cards while loading
  - Renders 4 categorized cards with category-specific icon/color
    (productivity = rose flame, trend = emerald trend-up,
    warning = amber alert, suggestion = sky lightbulb)
  - "Claude" or "Demo" badge in the header tells you which source is
    serving
  - Refresh button regenerates with subtle Framer Motion exit/enter
    transitions

### Key decisions

- **The fallback is not a "broken" state** — it's a feature. The
  bundled insights are written to feel like Claude wrote them.
  Reviewer/judge can't tell the difference visually unless they look
  at the badge.
- **Strict JSON output**, with code-fence stripping for Claude's
  occasional `\`\`\`json` wrapping. Parse failure → fall back.
- **Source badge** is honest: the panel shows "Claude" when the API
  succeeded and "Demo" otherwise. This builds trust during the demo.

### Verify
- `curl -X POST http://localhost:3000/api/insights -d '{}'` returns
  4 insights with valid categories
- Without `ANTHROPIC_API_KEY` → `source: "mock"`, badge shows "Demo"
- With a valid key → `source: "ai"`, badge shows "Claude", insights
  vary on refresh

---

## Phase 10 — Polish, Verify, Deploy (15 min)

**Goal**: ship-quality details.

### Files

- `public/favicon.svg` — custom gradient mark
- `app/layout.tsx` metadata — title, description, OG tags
- `vercel.json` — framework hint (so Vercel auto-detects Next 16)
- `.env.example` — documents the optional `ANTHROPIC_API_KEY`
- `README.md` — features, setup, demo script, trade-offs
- `BUILD_GUIDE.md` — *this file*

### Final verification checklist

Run through this end-to-end before declaring done:

1. **Build**: `npm run build` — zero TypeScript errors, zero
   eslint errors blocking the build
2. **Login → dashboard**: `/` → click GitHub → land on `/dashboard`
3. **All sections render**: metric cards, insights, charts, heatmap,
   leaderboard, timeline, repo list
4. **Theme toggle**: dark ↔ light, smooth, persists across reload
5. **Hovers**: metric cards lift, chart tooltips appear, heatmap
   cells highlight, leaderboard rows highlight
6. **Insights regenerate** without errors (rotates through pool when
   in demo mode)
7. **Logout**: returns to `/`, blocks re-entry to `/dashboard`
8. **Responsive**: resize to 375px, nothing breaks (sidebar may
   collapse / disappear)
9. **No console errors** in the browser devtools

### Deploy (optional, last 5 min)

```bash
npx vercel
# Follow prompts. Add ANTHROPIC_API_KEY in the Vercel project's env vars
# if you want live AI on production.
```

---

## How to use this guide during the hackathon

1. **Read Phase 0** the moment the hackathon starts. Lock the
   decisions. Don't re-litigate them.
2. **Work one phase at a time, in order**. Don't jump ahead — each
   phase assumes the previous is complete.
3. **Hit the verify step before moving on**. If you skip it you'll
   pay 3x the time debugging in Phase 9.
4. **Watch the clock per phase**. The time estimates are budgets, not
   averages.

### The 3-strike rule

If you blow past the budget on a phase:

| Slip | Action |
| ---- | ------ |
| > 20 min | **Simplify**. Cut the prettiest 30% of the feature. |
| > 30 min | **Mock it**. Hard-code the data, ship the UI. |
| > 45 min | **Remove it**. Move on. A polished small demo beats a broken ambitious one. |

### The non-negotiables

These three things are *never* worth cutting:

1. The dashboard loads without errors
2. The AI insights panel renders 4 cards (mocked or real)
3. Login → dashboard → logout works end-to-end

Everything else is negotiable.

---

## Architecture in one diagram

```
┌──────────────────────────────────────────────────────────────────┐
│  Browser                                                          │
│                                                                   │
│   localStorage["devdash_session"]      next-themes (class on html)│
│            │                                       │              │
│            ▼                                       ▼              │
│   ┌────────────────┐                  ┌────────────────────────┐  │
│   │  /  (login)    │ ◀── redirect ──  │  /dashboard            │  │
│   │  LoginCard     │                  │  AuthGuard wraps page  │  │
│   └────────┬───────┘                  │   ├─ Sidebar           │  │
│            │ signIn()                 │   ├─ Topbar            │  │
│            ▼                          │   ├─ MetricCards × 5   │  │
│   sets localStorage                   │   ├─ InsightsPanel ────│──┼──► POST /api/insights
│   redirect → /dashboard               │   ├─ CommitsChart      │  │            │
│                                       │   ├─ LanguageDonut     │  │            ▼
│                                       │   ├─ Heatmap           │  │  app/api/insights/route.ts
│                                       │   ├─ PrIssueChart      │  │            │
│                                       │   ├─ Leaderboard       │  │   lib/ai.ts: generateInsights()
│                                       │   ├─ ActivityFeed      │  │            │
│                                       │   └─ RepoList          │  │   ┌────────┴────────┐
│                                       └────────────────────────┘  │   │                 │
│                                                   ▲               │   ▼                 ▼
│                                                   │               │ Claude API     mock fallback
│                                                   │               │ (if key set)   (insights-fallback.ts)
│                                       ┌───────────┴───────────┐   │   │                 │
│                                       │   /mock/*.ts          │   │   └────────┬────────┘
│                                       │  (single source       │   │            │
│                                       │   of demo truth)      │   │     JSON response
│                                       └───────────────────────┘   │     { insights, source }
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Files map

```
hackathon/
├── app/
│   ├── page.tsx                     Phase 4  — login
│   ├── dashboard/page.tsx           Phase 5+ — assembled dashboard
│   ├── api/insights/route.ts        Phase 9  — AI endpoint
│   ├── layout.tsx                   Phase 1  — root + theme provider
│   └── globals.css                  Phase 1  — Tailwind v4 + tokens
├── components/
│   ├── theme-provider.tsx           Phase 1
│   ├── auth/login-card.tsx          Phase 4
│   ├── layout/
│   │   ├── sidebar.tsx              Phase 3
│   │   ├── topbar.tsx               Phase 3
│   │   └── theme-toggle.tsx         Phase 3
│   ├── dashboard/
│   │   ├── auth-guard.tsx           Phase 4
│   │   ├── page-header.tsx          Phase 5
│   │   ├── metric-card.tsx          Phase 5
│   │   ├── chart-card.tsx           Phase 6
│   │   ├── commits-chart.tsx        Phase 6
│   │   ├── pr-issue-chart.tsx       Phase 6
│   │   ├── language-donut.tsx       Phase 6
│   │   ├── heatmap.tsx              Phase 7
│   │   ├── activity-feed.tsx        Phase 8
│   │   ├── leaderboard.tsx          Phase 8
│   │   ├── repo-list.tsx            Phase 8
│   │   └── insights-panel.tsx       Phase 9
│   └── ui/                          Phase 1  — shadcn primitives
├── lib/
│   ├── ai.ts                        Phase 9
│   ├── auth.ts                      Phase 4
│   ├── format.ts                    Phase 2
│   └── utils.ts                     Phase 1
├── mock/                            Phase 2  — all demo data
├── public/favicon.svg               Phase 10
├── vercel.json                      Phase 10
├── .env.example                     Phase 10
├── README.md                        Phase 10
└── BUILD_GUIDE.md                   ← this file
```

---

## What I would change with more time

Honest list of things deferred from this MVP. Useful talking points if
asked "what's next?" during the demo:

- **Real GitHub OAuth + API** — replace the mock data layer with the
  GitHub REST/GraphQL API. The shape of the mock data is already a
  near-mirror of GitHub's API responses, so the swap is contained.
- **Streaming AI insights** — switch the Claude call to streaming
  (`client.messages.stream`) and render tokens as they arrive in the
  insight panel. Sells the "AI" angle harder.
- **Per-user persistence** — currently the dashboard is read-only.
  Adding a Postgres + Prisma layer for saved filters / notes would
  unlock a real product surface.
- **A real heatmap drill-down** — click a day to see that day's
  commits.
- **Mobile drawer for sidebar** — currently the sidebar is
  `hidden md:flex`. A `Sheet` drawer would be ~20 lines.
- **Tests** — Playwright for the login → dashboard → logout golden
  path; Vitest for the AI fallback parser.

---

## License

MIT.
