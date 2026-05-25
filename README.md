# Pulse — Developer Productivity Dashboard

A polished, AI-powered analytics dashboard for developers. Inspired by GitHub
Insights, Linear, WakaTime, and the Vercel Dashboard.

Built as a 3-hour hackathon MVP — speed, polish, and demo-ability over
enterprise complexity.

## Features

- **Mock GitHub auth** — one-click "Continue with GitHub" → session in
  `localStorage` → dashboard. Logout from the avatar dropdown.
- **5 metric cards** — Total Commits, Pull Requests, Open Issues, Coding
  Streak, Active Repos. Each card ships with a sparkline and trend chip.
- **AI insights** — 4 categorized insights (productivity / trend / warning /
  suggestion). Uses Claude Sonnet 4.6 when `ANTHROPIC_API_KEY` is set;
  otherwise serves pre-written fallbacks. The hand-off is invisible to the
  end user — same shape, same UX.
- **Commits-over-time area chart** with weekday/weekend modeling and a 7d /
  30d / 90d range chip.
- **PR vs Issue stacked bar chart**, 12 weeks of weekly cadence.
- **Language distribution donut** with center label and side legend.
- **GitHub-style contribution heatmap** — 52 weeks × 7 days, 5 intensity
  buckets, per-cell tooltips, month + weekday labels.
- **Team leaderboard** with animated bar fills and delta arrows.
- **Activity timeline** — 30+ events across commits, PRs, issues, and
  reviews, scrollable, color-coded by event kind.
- **Active repositories list** with language dots, stars, forks, and
  weekly commit counts.
- **Polished theme system** — dark by default with a smooth light-mode
  toggle (sun/moon swap, persisted in `localStorage`).
- **Fully responsive** — collapses cleanly down to mobile widths.
- **Framer Motion** stagger fade-ins, hover lifts, animated bar fills.

## Tech Stack

| Layer        | Choice                            |
| ------------ | --------------------------------- |
| Framework    | Next.js 16 (App Router, Turbopack) |
| Styling      | Tailwind CSS v4                   |
| Components   | shadcn/ui-style primitives        |
| Charts       | Recharts                          |
| Animation    | Framer Motion                     |
| Theme        | next-themes                       |
| Icons        | lucide-react                      |
| AI           | `@anthropic-ai/sdk` (Claude Sonnet 4.6) |
| Language     | TypeScript (strict)               |

## Getting Started

```bash
# Install
npm install

# Run dev
npm run dev
# → http://localhost:3000

# Build
npm run build && npm run start
```

### Optional: live AI insights

The dashboard works fully without any keys. To get **live Claude-generated
insights** instead of the bundled fallback set:

```bash
cp .env.example .env.local
# then edit .env.local and add your key:
# ANTHROPIC_API_KEY=sk-ant-...
```

Get a key at [console.anthropic.com](https://console.anthropic.com/).
The insight panel shows a green **Claude** badge when live AI is in use,
or **Demo** when serving the fallback.

### Optional: link your GitHub account

When you connect GitHub, the dashboard swaps to real data: your repos in
the **Active repositories** card, your real **contribution heatmap**, your
recent **activity feed** (commits, PRs, issues, reviews), and your real
avatar + name in the topbar. Each widget shows a green `[● live]` badge
when streaming real data.

**Option A — Sign in with GitHub (OAuth)**

Set up takes ~5 min:

1. Register an OAuth app at https://github.com/settings/applications/new
   - **Homepage URL**: `http://localhost:3001`
   - **Authorization callback URL**: `http://localhost:3001/api/auth/callback/github`
2. Copy the **Client ID** and a freshly generated **Client Secret** into
   `.env.local`:
   ```
   GITHUB_CLIENT_ID=...
   GITHUB_CLIENT_SECRET=...
   AUTH_SECRET=$(openssl rand -base64 32)
   ```
3. Restart `npm run dev`.
4. Click **Settings** in the sidebar → **GitHub integration** → **Sign in with GitHub**.

**Option B — Personal Access Token (no OAuth app needed)**

Faster for solo demos:

1. Open **Settings** in the sidebar → **GitHub integration**.
2. Click **Use a Personal Access Token instead**.
3. Create a fine-grained or classic PAT at
   [github.com/settings/tokens/new](https://github.com/settings/tokens/new?scopes=read:user,repo,read:org)
   with scopes: `read:user`, `repo`, `read:org`.
4. Paste it into the input. Pulse validates against the GitHub API and
   stores the token in your browser's localStorage only — never on disk.

## Project Structure

```
.
├── app/
│   ├── page.tsx                # Login screen
│   ├── dashboard/page.tsx      # Main dashboard
│   ├── api/insights/route.ts   # AI insights POST endpoint
│   ├── layout.tsx              # Root layout w/ ThemeProvider
│   └── globals.css             # Tailwind v4 + dark/light theme tokens
├── components/
│   ├── auth/                   # Login card
│   ├── layout/                 # Sidebar, topbar, theme toggle
│   ├── dashboard/              # All dashboard widgets
│   ├── ui/                     # shadcn primitives
│   └── theme-provider.tsx
├── lib/
│   ├── ai.ts                   # Claude call + parse + fallback
│   ├── auth.ts                 # Mock localStorage session
│   ├── format.ts
│   └── utils.ts
├── mock/                       # All demo data — deterministic generators
│   ├── activity.ts
│   ├── heatmap.ts
│   ├── insights-fallback.ts
│   ├── metrics.ts
│   ├── repos.ts
│   ├── team.ts
│   ├── timeseries.ts
│   └── user.ts
└── public/
    └── favicon.svg
```

## Demo Script

1. **Land on `/`** — polished login card with gradient backdrop, grid
   pattern, and a "Continue with GitHub" CTA.
2. **Click the button** — brief signing-in spinner, then redirect to the
   dashboard.
3. **Dashboard above the fold** — five metric cards staggered in, AI
   insights panel populated with four categorized cards.
4. **Toggle the theme** (top-right sun/moon icon) — the entire UI smoothly
   recolors. State persists across reloads.
5. **Hover anything** — metric cards lift, heatmap cells highlight with
   per-day tooltips, chart tooltips show values.
6. **Click "Regenerate"** in the AI insights panel — fresh insights load,
   with subtle re-stagger.
7. **Avatar dropdown → Sign out** — returns to `/`. Refreshing
   `/dashboard` while logged out redirects you back to login.

## Deployment

This is Vercel-ready out of the box.

```bash
npx vercel
```

Add `ANTHROPIC_API_KEY` in the Vercel dashboard's project settings if you
want live AI insights in production.

## Notes & Trade-offs

This is a hackathon MVP, not enterprise software. Intentional choices:

- **Mock data over real GitHub** — zero auth risk during demos. The mock
  data is realistic (weighted distributions, seeded randomness) and lives
  in one folder.
- **Mock auth over real OAuth** — a `localStorage` flag. Reliable,
  zero-config, and the dashboard never has to handle expired tokens.
- **AI fallback is a feature, not a bug** — the same UX whether the API
  key is present or not. The fallback insights are written to feel like
  Claude wrote them.
- **No database** — everything in-memory / static.

## License

MIT — built for the hackathon.
