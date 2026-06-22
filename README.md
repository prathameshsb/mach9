# NBI Bridge Explorer — Pennsylvania

A web application for exploring Pennsylvania's 23,202 highway bridges from the 2022 FHWA National Bridge Inventory dataset. Built as a Mach9 take-home assessment in approximately 10 hours.

**Live:** [https://mach9-chi.vercel.app](https://mach9-chi.vercel.app) &nbsp;|&nbsp; **Repo:** [github.com/prathameshsb/mach9](https://github.com/prathameshsb/mach9)

---

## What Was Asked vs. What Was Built

The brief asked for two things: a **grid view** and a **map view** of bridge data.

Both are here. But the data tells a richer story than two views can show — Pennsylvania has some of the oldest and most structurally compromised bridge stock in the country. Stopping at grid + map would surface the data without surfacing the insight. Every additional feature was added because it answers a question the raw data raises:

| Feature | Why it was added |
|---|---|
| **Grid view** | Core ask — browse all 23k bridges, paginated, sortable, filterable |
| **Map view** | Core ask — geospatial distribution with clustering, color-coded by condition |
| **Statistics sidebar** | Always-visible breakdown of Good/Fair/Poor counts under current filters — answers "what's the condition split?" instantly |
| **Worst Bridges tab** | Sorted by structural sufficiency score — answers "which specific bridges should I worry about?" |
| **County Comparison tab** | Side-by-side county metrics (avg condition, % deficient, % pre-1970) — answers "which county has the worst infrastructure?" |
| **Trends tab** | Line chart of bridge counts by construction year and condition — answers "when were these bridges built and are older ones in worse shape?" |
| **AI Chat** | Natural language → filter params via Gemini — answers "can a non-technical user find what they need?" |
| **Full-text search** | Searches location, road name, feature crossed — for when you know what you're looking for |

---

## Features

### Grid View
- Paginated table (50 per page) with sort by any column
- Color-coded condition badges (Good / Fair / Poor / N/A)
- Structurally deficient flag
- Click any row to open the Bridge Detail panel

### Map View
- OpenStreetMap base layer via Leaflet
- All bridges with valid coordinates plotted as colored markers
- Cluster aggregation at high zoom levels
- Click any marker to open the Bridge Detail panel
- Viewport-scoped queries — only loads bridges in current view (prevents 23k-pin browser crash)

### Sidebar Filters
- County (all 67 PA counties)
- Condition (Good / Fair / Poor)
- Year built range (min / max)
- Structurally deficient toggle
- Full-text search

All filters are URL-persisted via query params — switching between views preserves filter state, and filter URLs are shareable.

### Statistics Sidebar
Live condition breakdown (Good / Fair / Poor / Unknown counts + totals) under whatever filters are active.

### Worst Bridges Tab
Top structurally deficient bridges ranked by sufficiency score (lowest first). Reactive to county and year filters.

### County Comparison Tab
All 67 PA counties ranked by total bridges, with average condition score, % structurally deficient, and % built before 1970.

### Trends Tab
Recharts line chart with Good, Fair, and Poor lines plotted by construction year. Lines with zero data under the current filters are automatically suppressed. Reactive to all sidebar filters.

### Bridge Detail Panel
Slides in on card/marker click. Shows all NBI fields: structure number, condition ratings (deck, superstructure, substructure), year built, ADT, length, spans, lanes, material type, design type, deficiency status.

### AI Chat (Gemini 2.5 Flash)
Natural language queries converted to filter params. Multi-turn context preserved within a session. Example: "Show structurally deficient bridges in Philadelphia built before 1960" → applies `county=101, deficient=true, year_max=1960`.

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 15 App Router | FE + BE in one repo; API routes, SSR, and React all without a separate server |
| Database | Supabase (PostgreSQL) | 23k rows, free tier, generous query limits, built-in REST |
| Map | react-leaflet + OpenStreetMap | No API token required; open source; clustering via react-leaflet-cluster |
| Charts | Recharts | Composable React-native charting; handles line, bar, pie from one library |
| URL state | nuqs | Filter state in URL params — grid/map/tabs all share one source of truth, links are shareable |
| AI | Gemini 2.5 Flash | Fast, cost-effective; outputs structured JSON filter objects reliably |
| Styling | Tailwind CSS v4 | Utility-first; no design system overhead for a single-engineer project |
| Testing | Vitest + Testing Library | Fast, jsdom-based; co-located with components |
| Deploy | Vercel | Zero-config Next.js deployment |

---

## Running Locally

```bash
# Install dependencies
npm install

# Set environment variables
cp .env.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, GEMINI_API_KEY

# Start dev server
npm run dev

# Run tests
npm test
```

Open [http://localhost:3000/explore](http://localhost:3000/explore).

---

## Project Structure

```
src/
  app/
    api/
      bridges/          # GET /api/bridges — paginated list
      bridges/[id]/     # GET /api/bridges/[id] — single bridge
      bridges/map/      # GET /api/bridges/map — bbox query for map
      bridges/stats/    # GET /api/bridges/stats — condition breakdown
      bridges/trends/   # GET /api/bridges/trends — counts by year
      bridges/county-summary/  # GET /api/bridges/county-summary
      chat/             # POST /api/chat — Gemini filter extraction
    explore/            # Main explorer page
  components/
    bridges/
      BridgeGrid/       # Paginated table
      BridgeMap/        # Leaflet map
      BridgeDetail/     # Slide-in detail panel
      StatsSidebar/     # Condition breakdown sidebar
      WorstBridges/     # Worst bridges tab
      CountyComparison/ # County metrics tab
      TrendChart/       # Line chart tab
      FilterPanel/      # Sidebar filters
      SearchBar/        # Full-text search
    chat/               # AI chat panel
    ui/                 # Shared UI components
  lib/
    types.ts            # All TypeScript interfaces
    utils.ts            # Condition logic, formatters, PA county map
    supabase.ts         # Supabase client
supabase/
  migrations/           # SQL migrations
```

---

## Development Approach

See [APPROACH.md](./APPROACH.md) for the full development story — how features were scoped, what decisions were made and why, how the AI-assisted workflow was used, and how everything was verified.
