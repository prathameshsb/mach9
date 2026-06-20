# NBI Bridge Explorer — Project Approach

> Scaffolded via /project skill · 2026-06-20
> Updated progressively via /scout, /decision-log, /api-audit, /smoke-test, /review-pr

---

## Overview

| Field | Value |
|-------|-------|
| **Project** | NBI Bridge Explorer |
| **Assignment** | Mach9 Take-Home — fischer@mach9.io |
| **Goal** | A web app to explore Pennsylvania's 23,202 bridges (2022 NBI data) through a drive-style grid view and geospatial map view, with AI-powered natural language search via Gemini |
| **Ship Target** | ~10 hours from start · Present to Mach9 team |
| **Status** | Pre-implementation — /scout in progress |
| **Repo** | https://github.com/prathameshsb/mach9 |
| **Live URL** | TBD (Vercel) |

---

## Stakeholders

| Role | Name | Responsibility |
|------|------|---------------|
| Owner / FE+BE | Prathamesh | Full-stack implementation, all decisions |
| Evaluator | Fischer @ Mach9 | Assessment review, presentation Q&A |

---

## Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | Next.js 15 App Router | FE + BE in one, assessment friendly |
| Database | Supabase + PostGIS | 23k rows, spatial queries, free tier |
| Map | react-leaflet + OpenStreetMap | No token required, open source |
| Map clustering | react-leaflet-cluster | Handles 23k pins without crashing browser |
| URL state | nuqs | Grid ↔ map sync, shareable filter URLs |
| Grid perf | @tanstack/react-virtual | Virtual scroll through 23k records |
| AI | Gemini 2.5 Flash | Natural language → bridge filters |
| Styling | Tailwind CSS v4 | Fast, consistent, no design system needed |
| Deploy | Vercel | Already connected |

---

## Acceptance Criteria

> [ ] = not started · [~] = in progress · [x] = done · [?] = needs answer from /scout

### 1. Grid View
- [ ] Displays bridge cards in a responsive grid (min 2 cols mobile, 3 cols tablet, 4 cols desktop)
- [ ] Each card shows: bridge name/road, what it crosses, condition badge (Good/Fair/Poor), year built, daily traffic, length, county
- [ ] Condition badge color-coded: green (7–9), amber (5–6), red (0–4), gray (N/A)
- [ ] Cards support virtual scrolling — only visible rows rendered
- [ ] Pagination: 50 per page with prev/next
- [ ] Sort by: condition (asc/desc), year built, ADT, structure length
- [?] What shows when overall_cond is null?
- [?] What shows when location and features_desc are both null?

### 2. Map View
- [ ] OpenStreetMap base layer via react-leaflet
- [ ] All bridges with valid coordinates plotted
- [ ] Dense areas cluster into numbered bubbles
- [ ] Click cluster → zooms in and expands
- [ ] Click bridge marker → opens Bridge Detail panel
- [ ] Marker color matches condition badge (green/amber/red/gray)
- [ ] Map only loads bridges within current viewport bbox (not all 23k at once)
- [?] What shows while map tiles are loading?
- [?] What shows if bbox returns 0 results?

### 3. Shared Filters & Search
- [ ] Search bar: searches location, facility_carried, features_desc
- [ ] Filter: Condition (Good / Fair / Poor)
- [ ] Filter: County (dropdown of all 67 PA counties)
- [ ] Filter: Year Built range (min/max slider or inputs)
- [ ] Filter: Structurally Deficient toggle
- [ ] All filter state lives in URL params (nuqs) — switching Grid ↔ Map preserves filters
- [ ] Filters apply to both views simultaneously
- [ ] Clear all filters button
- [?] What shows in the grid while a search/filter is loading?
- [?] What's the empty state when filters match 0 bridges?

### 4. Bridge Detail Panel
- [ ] Slides in from the right on card click (grid) or marker click (map)
- [ ] Shows: structure number, location, county, facility carried, feature crossed
- [ ] Shows all condition ratings: deck, superstructure, substructure, channel/culvert
- [ ] Shows: year built, year reconstructed, ADT, structure length, num spans, num lanes
- [ ] Shows: material type, design type, structural deficiency status
- [ ] Close button / click outside to dismiss
- [?] What shows if a detail field is null/0?

### 5. Gemini Chat
- [ ] Chat panel toggled via button in header
- [ ] User types natural language query
- [ ] Gemini 2.5 Flash converts query to filter params
- [ ] App applies filters and updates grid/map
- [ ] Chat responds with a plain-English explanation of what was found
- [ ] Multi-turn context preserved within session
- [?] What shows if Gemini returns filters that match 0 bridges?
- [?] What if the GEMINI_API_KEY is missing?
- [?] What's the loading state while Gemini responds?

### 6. Performance & Cross-Cutting
- [ ] Grid initial load < 1.5s at 50 bridges per page
- [ ] Map bbox query returns within 500ms for typical viewport
- [ ] Switching Grid ↔ Map does not re-fetch if filters unchanged
- [ ] App is deployable on Vercel with env vars set
- [ ] No 500 errors in API routes under normal usage

---

## Conditional Display Rules

> Filled in by /scout · 2026-06-20

| Component | State / Condition | What Shows | Null / Empty Behavior | Notes |
|-----------|------------------|-----------|----------------------|-------|
| BridgeCard | overall_cond 7–9 | Green "Good" badge | — | — |
| BridgeCard | overall_cond 5–6 | Amber "Fair" badge | — | — |
| BridgeCard | overall_cond 0–4 | Red "Poor" badge | — | — |
| BridgeCard | overall_cond = null | Gray "N/A" badge | Always show gray, never blank | — |
| BridgeCard | structural_deficiency = true | "SD" pill tag alongside condition badge | — | Only show when true |
| BridgeCard | facility_carried present | Use as card title | — | Priority 1 for name |
| BridgeCard | facility_carried null, features_desc present | Use features_desc as title | — | Priority 2 |
| BridgeCard | both null | Use structure_number as title | — | Priority 3 fallback |
| BridgeCard | adt = null | Hide traffic row | Show "—" | Never show "0 vehicles/day" |
| BridgeCard | year_built = null | Hide year row | Show "—" | — |
| BridgeCard | structure_length = null | Hide length row | Show "—" | — |
| BridgeGrid | loading | Show 12 skeleton shimmer cards | — | Maintain grid layout |
| BridgeGrid | 0 results | "No bridges match your filters" + Clear Filters button | — | Centered, full grid area |
| BridgeMap | lat/lng = null | Bridge not plotted | Skip silently, no error | All 23,202 have coords |
| BridgeMap | loading (bbox fetch) | Subtle spinner in top-right corner | — | Don't block map interaction |
| BridgeMap | bbox returns 0 bridges | "No bridges in this area" overlay | — | Fades after 3s |
| BridgeMap | zoom too wide (>5000 results) | "Zoom in to see all bridges" banner | Cap at 5000 markers | Prevent browser crash |
| BridgeDetail | any field = null | Show "—" for that field | Never leave a label without a value | — |
| BridgeDetail | loading | Skeleton rows for each field | — | — |
| BridgeDetail | structure_length | Always convert meters → feet | Show "—" if null | (value × 3.28084) |
| BridgeDetail | sufficiency_rating | Label as "Structural Evaluation (0–9)" | — | NOT "0-100 Sufficiency" — different scale |
| BridgeDetail | county_code | Look up PA_COUNTIES map → show name | Show code if lookup fails | "101" → "Philadelphia" |
| BridgeDetail | material_type / design_type | Look up code → show label | Show "Unknown" if not in map | "3" → "Steel" |
| ChatPanel | GEMINI_API_KEY missing/invalid | "AI chat unavailable" message, input disabled | — | Fail gracefully |
| ChatPanel | loading (awaiting Gemini) | 3-dot typing indicator | — | Disable input while loading |
| ChatPanel | Gemini returns 0-result filters | "No bridges matched — try rephrasing" in chat | — | Don't clear existing view |
| ChatPanel | Gemini returns filters | Apply filters to grid/map + show reply | — | Reply explains what was found |
| SearchBar | loading | Show subtle spinner inside input | — | Don't disable input |
| SearchBar | query cleared | Reset to full unfiltered results | — | — |

---

---

## /scout Analysis

> Full analysis — 2026-06-20

### Q1 — What exactly is this?

A public, no-auth web application for exploring Pennsylvania's 23,202 highway bridges from the 2022 FHWA National Bridge Inventory dataset. The primary audience is anyone curious about bridge infrastructure — researchers, journalists, engineers, or government staff. The app lets users browse bridges in a card grid or on a map, filter by condition/county/year/traffic, click into a detail view, and ask natural language questions via an AI chat panel.

### Q2 — User Experience Flow

**Default landing:**
1. User arrives at `/` → redirected to `/explore`
2. Grid view loads with 50 bridges (default sort: year_built DESC)
3. Left sidebar: filter panel (condition, county, year range, deficient toggle)
4. Top: search bar (debounced 300ms) + view toggle (Grid | Map) + Chat button
5. Grid: 4-column responsive card layout

**Browsing the grid:**
6. User scrolls → virtual scroll renders only visible cards
7. User types search → grid updates after 300ms, URL ?q= updates
8. User applies filter → URL updates, grid re-fetches
9. User clicks a card → Detail panel slides in from right, ?id= added to URL
10. User closes panel → panel slides out, ?id= removed from URL

**Switching to map:**
11. User clicks Map toggle → view switches, URL ?view=map
12. Same filters apply — map queries Supabase with current bbox + active filters
13. Dense areas show numbered cluster circles
14. User drags/zooms map → after 400ms debounce, bbox re-query fires
15. User clicks cluster → map zooms into cluster area
16. User clicks a bridge marker → same Detail panel as grid

**Using AI chat:**
17. User clicks Chat button → chat panel slides in from right (doesn't replace detail)
18. User types: "show me structurally deficient bridges in Philadelphia built before 1960"
19. Typing indicator shows while Gemini processes
20. Gemini returns: `{ county: "101", deficient: "true", year_max: "1960" }`
21. Filters apply to grid/map, URL updates
22. Chat shows: "Found 47 structurally deficient bridges in Philadelphia County built before 1960."
23. User can ask follow-up: "which ones have the lowest condition rating?"
24. Gemini adds sort: `{ sort: "overall_cond", order: "asc" }`

**Empty and error states:**
- 0 search results → "No bridges match. Try different filters." + Clear all
- Map 0 results → "No bridges in this area" (fades after 3s)
- API error → "Failed to load. Refresh?" with retry button
- Chat error → "Chat unavailable" in panel

### Q3 — PM Questions (resolved as design decisions)

| Question | Decision |
|----------|---------|
| Default sort order? | year_built DESC — shows modern bridges first |
| Deficient bridges — emphasize more? | Yes — "SD" pill tag on card + red marker on map |
| Share link to specific bridge? | Yes — ?id= in URL makes detail panel bookmarkable |
| Grid + map: same page or separate routes? | Same page with toggle |
| Mobile: filters modal or sidebar? | Collapsible sidebar (desktop), bottom sheet (mobile best-effort) |

### Q4 — Design Questions (resolved)

| Question | Decision |
|----------|---------|
| Filter sidebar: always visible or collapsible? | Collapsible — toggle button, defaults open on desktop |
| Detail panel: slide-in or modal? | Slide-in from right (sidebar pattern) |
| Map markers: circles or pins? | Colored circles — simpler, works well with clustering |
| Condition badge: pill or tag? | Pill with color fill |
| Card layout: fixed height or variable? | Fixed height (uniform grid) |

### Q5 — Rollout Risks

| Risk | Mitigation |
|------|-----------|
| Map renders 23k markers at once → crash | bbox query, cap at 5000, cluster client-side |
| Gemini API key missing → chat breaks | Graceful fallback, chat panel shows disabled state |
| Supabase free tier rate limits | Pagination (50/page), bbox capping, no polling |
| NBI data quality (null coordinates) | All 23,202 records have valid lat/lng — verified at import |
| structure_length in meters not feet | Convert in utils.ts `formatLength()` — done |

### F7 — Sibling Component Inventory

Fresh codebase. Patterns already established in `src/lib/utils.ts` that all components must follow:
- `getConditionLevel(rating)` → 'good' | 'fair' | 'poor' | 'unknown'
- `conditionColors` → Tailwind class map for each level
- `conditionDotColors` → hex color map for map markers
- `getBridgeName(bridge)` → priority-ordered name string
- `formatADT(adt)` → "1.5k/day" formatted string
- `formatLength(meters)` → feet conversion string

All components must use these utils. Never re-derive condition colors independently.

### F8 — API Contract

**GET /api/bridges** — Bridge list

Query params:
| Param | Type | Notes |
|-------|------|-------|
| q | string | Full-text search against location + facility_carried + features_desc |
| county | string | 3-digit PA county code e.g. "101" |
| condition | "good"\|"fair"\|"poor" | Maps to overall_cond ranges |
| year_min | number string | year_built >= value |
| year_max | number string | year_built <= value |
| deficient | "true" | structural_deficiency = true |
| page | number string | Default 1 |
| sort | string | Column name, default "year_built" |
| order | "asc"\|"desc" | Default "desc" |

Response shape:
```json
{
  "data": [Bridge],
  "count": 23202,
  "page": 1,
  "pageSize": 50,
  "totalPages": 465
}
```

**GET /api/bridges/[id]** — Single bridge
Response: `Bridge` object or 404

**GET /api/bridges/map** — Map bbox query

Query params: `north`, `south`, `east`, `west` (decimal degrees) + all filter params
Response: `{ "data": [BridgeMapPoint] }` — max 5000 items
BridgeMapPoint: `{ id, lat, lng, structure_number, overall_cond, structural_deficiency, location, features_desc }`

**POST /api/chat** — Gemini chat

Body: `{ message: string, history: ChatMessage[] }`
Response: `{ reply: string, filters?: BridgeFilters }`
Gemini instruction: return JSON with optional `filters` object + plain-English `reply`

**Field gotchas the FE must handle:**
| Field | Gotcha |
|-------|--------|
| structure_length | Meters in DB → must multiply × 3.28084 for feet |
| sufficiency_rating | Scale 0–9 (appraisal), NOT 0–100 sufficiency score — label carefully |
| county_code | 3-digit padded string → PA_COUNTIES lookup for name |
| material_type / design_type | Integer code → lookup MATERIAL_TYPES / DESIGN_TYPES maps |
| overall_cond | 0 is valid (failed bridge) — treat 0 as "Poor", not as null |
| adt | 0 in DB means unknown (null) — already handled at import |
| year_built | 0 in DB means unknown (null) — already handled at import |

### F9 — State Management

**URL state (nuqs) — persists across navigation, shareable:**
```
?q=           search query
?county=      county code "101"
?condition=   "good"|"fair"|"poor"
?year_min=    number
?year_max=    number
?deficient=   "true"
?view=        "grid"|"map"  (default: "grid")
?id=          bridge id (opens detail panel)
?page=        number (default: 1)
?sort=        column name
?order=       "asc"|"desc"
```

**Local state (useState — ephemeral, not in URL):**
- `chatOpen: boolean` — chat panel visibility
- `chatHistory: ChatMessage[]` — conversation within session
- Map viewport (managed internally by Leaflet, not in state)

**Re-fetch triggers:**
- Any URL param change → grid re-fetches (useEffect on searchParams)
- Map `moveend` event → bbox re-fetches (debounced 400ms)
- ?id= change → detail re-fetches
- Chat submit → POST /api/chat

**Key rule:** Grid and map never share a fetch. Grid uses paginated REST params. Map uses bbox. Both honor the same filter params.

### F10 — Test Strategy

**Unit tests (pure functions in utils.ts):**
- `getConditionLevel`: null→unknown, 0→poor, 4→poor, 5→fair, 6→fair, 7→good, 9→good
- `formatADT`: null→"N/A", 0→"N/A", 999→"999/day", 1000→"1.0k/day", 50000→"50.0k/day"
- `formatLength`: null→"N/A", 10.5m→"34 ft", 305m→"1001 ft"
- `getBridgeName`: all-null→structure_number, facility_carried wins, features_desc 2nd priority
- `conditionColors`: each level returns correct Tailwind class string

**Integration (smoke test):**
- GET /api/bridges returns 50 bridges, correct pagination headers
- GET /api/bridges?condition=poor returns only bridges with overall_cond ≤ 4
- GET /api/bridges/map?north=42&south=39&east=-74&west=-80 returns ≤ 5000 results within PA
- POST /api/chat with "Philadelphia bridges" → filters contain county "101"
- Bridge with null overall_cond → card shows gray "N/A" badge

**Manual smoke (Stage 2):**
- Condition filter → only correct bridges shown
- Search "Philadelphia" → relevant bridges
- Click card → detail panel opens with correct data
- Switch to map → same bridges visible
- Chat query → filters update, chat shows reply
- Clear all → returns to full 23k unfiltered

### F11 — Accessibility

| Element | Requirement |
|---------|------------|
| SearchBar input | `aria-label="Search bridges by location or road name"` |
| Filter fieldsets | `<fieldset><legend>Filter by condition</legend>` grouping |
| Condition badges | `aria-label="Condition: Good"` |
| BridgeCard | `role="article"`, keyboard focusable, Enter to open detail |
| DetailPanel | Focus moves to panel on open; returns to triggering card on close |
| Close button | `aria-label="Close bridge detail"` |
| Map | `aria-label="Map showing bridge locations"` |
| Chat input | `aria-label="Ask about bridges"` |
| Chat submit | `aria-label="Send message"` |

### F12 — Observability

For assessment scope:
- `console.error` on all API failures with context
- Response time logged for bbox queries (Supabase is fast but PostGIS queries vary)
- Gemini errors surfaced in chat UI

Post-assessment additions: Vercel Analytics, Sentry for API errors.

### F13 — Open Questions (consolidated + resolved)

| # | Question | Resolution |
|---|----------|-----------|
| 1 | "Drive-style grid" reference? | Interpreted as card grid like Zillow/Autotrader — dense, scannable, uniform |
| 2 | Gemini multi-turn? | Yes — send last 10 messages as history |
| 3 | Default sort? | year_built DESC |
| 4 | Map loads all or bbox? | Bbox only, cap 5000 |
| 5 | Mobile? | Desktop-first, best-effort responsive |
| 6 | overall_cond = 0 → null or poor? | Poor (0 is a valid NBI rating meaning "Failed") |
| 7 | sufficiency_rating label? | "Structural Evaluation (0–9)" — NOT "Sufficiency Rating" |

### F14 — Acceptance Criteria (Match Rules / Given-When-Then)

**Grid loads**
Given user navigates to /explore / When page loads / Then grid shows 50 bridges sorted by year_built DESC, condition badges colored correctly, URL has no filter params

**Search**
Given user types "Philadelphia" in search / When 300ms debounce passes / Then grid shows only bridges matching Philadelphia in location/facility/features, URL updates to ?q=Philadelphia, bridge count updates

**Condition filter**
Given user selects "Poor" condition filter / When filter applied / Then every visible bridge has overall_cond ≤ 4 OR overall_cond is null AND structural_deficiency badge shown if applicable

**Detail panel — grid**
Given user clicks a bridge card / When click fires / Then detail panel slides in from right within 200ms, all bridge fields show (nulls display "—"), URL adds ?id=

**Detail panel — map**
Given user clicks a map marker / When click fires / Then same detail panel behavior as grid click

**View toggle**
Given user is on grid with active filters / When user clicks Map toggle / Then map shows only filtered bridges as markers, same filter params in URL, no filter state lost

**Map clustering**
Given user views map at state-level zoom / When map loads / Then bridges cluster into numbered bubbles, zooming in expands clusters, individual markers visible at street level

**Chat — basic query**
Given user types "show structurally deficient bridges in Philadelphia" / When submit / Then Gemini returns filters {county:"101", deficient:"true"}, grid/map updates, chat shows count of results

**Chat — follow-up**
Given user follows up "which have the worst condition?" / When submit / Then Gemini adds sort:{sort:"overall_cond", order:"asc"} to existing filters, results re-sort

**Empty state**
Given filters match 0 bridges / When results return / Then grid shows "No bridges match your filters" with Clear Filters button, map shows no markers

| # | Question | Owner | Status |
|---|----------|-------|--------|
| 1 | Is "drive-style grid" modeled on a specific product (Zillow, Autotrader)? | Mach9 / interpretation | Open |
| 2 | Should Gemini chat be multi-turn (conversational) or single-query? | Design decision | → Multi-turn, richer experience |
| 3 | Mobile responsiveness — full responsive or desktop-first acceptable? | Assessment | → Desktop-first, responsive best-effort |
| 4 | Grid and map on same page (toggle) or separate routes? | Design decision | → Same page, toggle |
| 5 | Should ADT display in vehicles/day or formatted (1.5k/day)? | Design decision | → Formatted |
| 6 | Structure length — meters (raw NBI) or convert to feet? | Design decision | → Convert to feet for US audience |

---

## Rollout Plan

### Phase 1 — Local (complete)
- Next.js scaffold ✓
- Supabase project created ✓
- 23,202 PA bridges imported ✓
- PostGIS geom column populated ✓

### Phase 2 — Implementation (next)
- All API routes
- All UI components
- Grid + map + chat
- End-to-end working locally

### Phase 3 — Deploy
- Vercel deploy with env vars
- GitHub push
- Smoke test on live URL

---

## Notes & Decisions

> Running log — most recent first. Full entries in /decision-log.

| Date | Decision | Summary |
|------|----------|---------|
| 2026-06-20 | Map library | Leaflet + OpenStreetMap over Mapbox — no token required, open source, sufficient for assessment |
| 2026-06-20 | URL state | nuqs over Redux/Zustand — URL-native, grid↔map sync, shareable filter links |
| 2026-06-20 | Grid perf | @tanstack/react-virtual — virtual scroll, only renders visible cards at 23k scale |
| 2026-06-20 | AI integration | Gemini output = filter params (not SQL) — safe, predictable, no direct DB from LLM |
| 2026-06-20 | Data scope | PA only (2022 NBI) — 23,202 bridges, sufficient for demo, avoids 50-state complexity |
| 2026-06-20 | No auth | No login/accounts — assessment scope, data is public |
