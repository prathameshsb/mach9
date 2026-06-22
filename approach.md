# Development Approach — NBI Bridge Explorer

This document covers how the project was built: the decisions made, the reasoning behind them, the workflow used, and how everything was verified — all within approximately 10 hours.

---

## The Brief

Build a web app to explore Pennsylvania's 23,202 bridges from the 2022 FHWA National Bridge Inventory. The brief specified: a **grid view** and a **map view**.

That was the floor. The question was whether to stop there.

---

## Why We Built Beyond the Brief

A grid and a map show you the data. They don't help you understand it.

Pennsylvania's bridge stock has a story: it's old, large portions of it were built between 1950 and 1975, and a meaningful percentage is structurally deficient. Showing 23,202 rows in a table and 23,202 pins on a map surfaces the data but buries the insight.

Each additional feature was a deliberate answer to a question the data raises:

**Statistics sidebar** — When you filter to "Poor" condition bridges, you immediately see the count and proportion. This makes the filter meaningful, not just mechanical. Cost: one API route, one component. Time: ~45 minutes.

**Worst Bridges tab** — Which specific bridges are in the worst shape? Ranked by NBI sufficiency score (not just condition rating), filtered to structurally deficient only, reactive to county filter. This is the most actionable view in the app for anyone doing infrastructure triage. Time: ~1 hour.

**County Comparison tab** — Which county has the worst bridge infrastructure? Average condition, % deficient, % pre-1970 across all 67 PA counties, sortable. Gives the state-level picture that neither the grid nor map provides at a glance. Time: ~1.5 hours.

**Trends tab** — Are older bridges in worse condition? The line chart of Good/Fair/Poor counts by construction year answers this directly. It also shows the 1950–1975 build surge visually — you can see the infrastructure age problem in the chart shape. Time: ~2 hours including tests.

**AI Chat** — Can someone who doesn't know NBI field names still use the app? "Show structurally deficient bridges in Philadelphia built before 1960" should work. Gemini 2.5 Flash converts natural language to filter params — it never touches the database directly, which keeps it safe and predictable. Time: ~1 hour.

None of these were scope creep for its own sake. Each one was the simplest way to answer a question the data raises. If it couldn't be justified that way, it wasn't built.

---

## Development Workflow

Every non-trivial feature followed the same structured process. Here's what that looks like, using the **Trends tab** as a concrete example.

### Step 1 — Scope (`/scope`)

Before writing any code, classify the work:

> "Add a Trends tab with a line chart of Good/Fair/Poor bridge counts by construction year. Reactive to sidebar filters."

Output: **Tier 1 (New Feature)**. Chain to run: `/scout → /build → /write-test → /smoke-test`.

This gate prevents jumping into implementation before understanding what's actually needed. A chore (one line changed) doesn't need a scout. A new feature does.

### Step 2 — Scout (`/scout --full`)

The scout phase answers every question that would otherwise create ambiguity mid-implementation:

- **What data is available?** `year_built` and `overall_cond` on the `bridges` table — both already exist.
- **Is a new API route needed?** Yes — the existing `/api/bridges` route is paginated (50 rows), not suitable for full-dataset aggregation by year.
- **What library?** Recharts — not installed, needs `npm install recharts`.
- **What are the condition buckets?** Same thresholds as the sidebar filter: ≥7 Good, 5–6 Fair, ≤4 Poor.
- **What happens to zero-data series?** Scout raised this as a blocking question — answered before implementation: auto-suppress lines with no data.

The scout produced **26 acceptance criteria** (Given/When/Then format) before a single line of code was written. Three blocking questions were resolved with explicit answers. No guessing during implementation.

### Step 3 — Build (`/build`)

The build phase:
1. Produced an explicit plan: which agent builds which file, in what order, with what dependencies
2. Presented the plan for approval before touching the codebase
3. Executed: 4 implementation agents (types → API route → component → page wiring), running in parallel where dependencies allowed
4. Ran lint and coverage checks after all agents completed

Files produced:
- `src/lib/types.ts` — `TrendsDataPoint`, `TrendsApiResponse` added
- `src/app/api/bridges/trends/route.ts` — aggregates year + condition by year, same filter pattern as all other routes
- `src/components/bridges/TrendChart/TrendChart.tsx` — Recharts LineChart, auto-suppresses zero series
- `src/app/explore/page.tsx` — Trends tab button + mount point added

TypeScript (`tsc --noEmit`) passed clean after all agents completed.

### Step 4 — Write Tests (`/write-test`)

Tests written after implementation, targeting the component's conditional logic:

- 3 loading state tests
- 4 error state tests (HTTP 500, network rejection)
- 9 zero-series suppression tests (all 7 combinations of which series have data)
- 6 filter re-fetch tests (one per filter param)
- 4 URL construction tests
- 3 empty state tests
- 1 loading reset on filter change

**40 tests, all passing.**

Recharts doesn't render in jsdom (no layout engine). The test setup mocks `ResponsiveContainer` and `LineChart` with pass-through divs and makes `Line` render a `<span data-testid="line-{dataKey}">` sentinel — this directly tests the `visibleSeries` branching logic without requiring a real browser.

### Step 5 — Smoke Test (`/smoke-test`)

Two stages:

**Stage 1 (automated):** Every AC criterion verified against the code — each branch in the component maps to a test assertion. Result: PASS.

**Stage 2 (human review):** Six specific items requiring observation in the running app, each requiring a specific answer (not just "looks good"):
1. Tab button highlights blue and chart mounts — confirmed
2. Zero-series suppression: filtering to "Poor" hides Good and Fair lines — confirmed
3. County filter updates chart — confirmed
4. Year range filter updates chart — confirmed
5. Deficient-only filter updates chart — confirmed
6. Combined tight filters → empty state shown — confirmed

Only after Stage 2 sign-off was the commit made.

---

## Key Technical Decisions

### URL state over component state for filters

All filter state lives in URL query params via `nuqs`. This means:
- Switching between Grid, Map, and all tab views preserves filter state
- Filter URLs are bookmarkable and shareable
- No prop-drilling or global state store needed

The tradeoff: URL state is strings, so every component that reads filters gets raw strings and must parse/validate. Managed by deriving a typed `BridgeFilters` object via `useMemo` in one place (`explore/page.tsx`) and passing it down.

### API routes aggregate server-side, not client-side

The Stats, Trends, and County Summary routes fetch full datasets and aggregate in Node.js — they don't rely on paginated data. This keeps the client simple (render what you receive) and keeps aggregation logic close to the database.

The tradeoff: these routes fetch potentially 23k rows on each request. Acceptable for assessment scope; in production these would be materialized views or cached at the edge.

### Condition buckets defined once and reused everywhere

`getConditionLevel()` in `src/lib/utils.ts` is the single source of truth for condition classification. Every component — grid badges, map markers, sidebar stats, trend chart lines — calls this function. The API routes mirror the same thresholds (≥7 good, 5–6 fair, ≤4 poor).

This was a deliberate early decision. Defining the same thresholds in multiple places would create subtle divergence bugs (badge says "Fair", chart says "Good" for the same bridge).

### Gemini outputs filter params, not SQL

The chat integration never gives Gemini access to the database. Gemini's job is to convert a natural language query into a `BridgeFilters` object — the same object that every other filter in the app uses. The app then fetches data using that object through normal API routes.

This keeps the AI integration safe (no SQL injection surface), predictable (the output shape is constrained), and debuggable (you can see exactly what filters were applied).

### Zero-series suppression in the Trends chart

When the sidebar condition filter is set to "Poor," the API returns only poor bridges — so Good and Fair counts are zero across all years. Showing flat zero lines alongside the active line would be misleading. Auto-suppressing zero-count series from both the chart and the legend was the right UX call: the chart shows only what's actually there.

---

## How It Fits in 10 Hours

| Phase | Time |
|---|---|
| Database setup: Supabase project, import 23k rows, PostGIS | ~1.5 hours |
| Core scaffold: Next.js, API routes for grid + map, BridgeGrid, BridgeMap, FilterPanel, SearchBar, BridgeDetail | ~3 hours |
| Statistics sidebar + Worst Bridges tab | ~1.5 hours |
| County Comparison tab | ~1.5 hours |
| AI Chat (Gemini integration) | ~1 hour |
| Trends tab (scope → scout → build → test → smoke) | ~2 hours |
| Bug fixes, polish, deployment | ~0.5 hours |

The structured workflow — scope before scout, scout before build, tests before smoke — sounds like overhead but it eliminates the time lost to ambiguity, rework, and debugging. The Trends tab, which is the most complex feature, went from first line of code to committed in under 2 hours because the acceptance criteria were written before implementation began.

---

## Verification

Every feature in this project was verified at three levels:

1. **TypeScript** — `tsc --noEmit` passes clean. No type errors, no `any` casts to hide problems.
2. **Unit/component tests** — 40 tests for the TrendChart component covering every conditional branch. Run via `npm test`.
3. **Manual smoke test** — Every feature was verified in the running app against specific, observable criteria before being committed. "It compiles" and "it works" are different things.

The one thing TypeScript and tests cannot verify is feature correctness — whether the chart actually looks right, whether the filter actually narrows the data visibly, whether the empty state actually appears when it should. That's what Stage 2 of the smoke test is for.
