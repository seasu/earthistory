# CLAUDE.md — Earthistory

## Project Overview

Earthistory is a Google Earth-like interactive map for exploring Earth and human history. Users navigate a timeline from 3500 BCE to 2026 CE and view geo-located historical events on a 2D (MapLibre) or 3D (CesiumJS) globe.

**Staging URLs:**
- Frontend: `https://seasu.github.io/earthistory/`
- API: `https://earthistory-api-staging.onrender.com`

---

## Repository Structure

```
earthistory/                  # Monorepo root (pnpm workspaces)
├── apps/
│   ├── api/                  # @earthistory/api — Fastify REST API (Node.js + TypeScript)
│   │   ├── src/
│   │   │   ├── app.ts        # Fastify app factory, plugin registration
│   │   │   ├── server.ts     # Entry point, starts server
│   │   │   ├── db.ts         # pg.Pool singleton (lazy init from DATABASE_URL)
│   │   │   ├── openapi.ts    # OpenAPI spec definition
│   │   │   ├── data/mock.ts  # Fallback mock data (used when DATABASE_URL not set)
│   │   │   ├── plugins/
│   │   │   │   ├── query.ts      # GET /events, /regions, /sources, /stats
│   │   │   │   ├── search.ts     # GET /search (full-text)
│   │   │   │   ├── ingestion.ts  # POST /ingestion/* (Wikidata import pipeline)
│   │   │   │   └── admin.ts      # POST /admin/* (internal admin operations)
│   │   │   └── services/
│   │   │       ├── wikidata.service.ts  # Wikidata/Wikipedia SPARQL + API client
│   │   │       └── topic.service.ts     # Topic hierarchy persistence
│   │   └── scripts/
│   │       ├── migrate.js           # Runs SQL migrations in order
│   │       ├── ingest-seed.mjs      # Seeds events from infra/data/seed/
│   │       └── ingest-wikipedia-images.mjs  # Enriches events with Wikipedia images
│   └── web/                  # @earthistory/web — React + Vite SPA
│       ├── src/
│       │   ├── main.tsx      # React entry, wraps App in LocaleProvider
│       │   ├── App.tsx       # Root component: state, data fetching, layout
│       │   ├── i18n.tsx      # Locale context, t() function, formatYear()
│       │   ├── YearCarousel.tsx  # Timeline slider + density sparkline
│       │   ├── map/
│       │   │   ├── MapViewport.tsx          # Lazy-loads correct map provider
│       │   │   ├── types.ts                 # MapMode, MapProviderProps
│       │   │   └── providers/
│       │   │       ├── MapLibreProvider.tsx  # 2D map (default)
│       │   │       └── CesiumProvider.tsx    # 3D globe (lazy loaded)
│       │   ├── components/
│       │   │   ├── EventDetail.tsx   # Event card with image, YouTube, metadata
│       │   │   └── TopicIngest.tsx   # Topic ingestion dialog (preview → confirm)
│       │   ├── hooks/
│       │   │   └── useWikipedia.ts   # Hook for fetching Wikipedia article previews
│       │   └── styles.css
│       ├── tests/e2e/
│       │   └── critical-flows.spec.ts  # Playwright E2E tests
│       ├── vite.config.ts
│       └── playwright.config.ts
├── packages/
│   └── shared/               # @earthistory/shared — shared types (currently minimal)
├── infra/
│   ├── db/
│   │   ├── migrations/       # Sequential SQL migrations (0001–0008)
│   │   ├── seed/             # SQL seed data
│   │   ├── scripts/          # Shell scripts for local DB management
│   │   └── docker-compose.yml  # Local PostgreSQL + PostGIS
│   ├── data/
│   │   ├── seed/events.seed.json       # Seed event data
│   │   ├── normalized/events.normalized.json
│   │   ├── normalized/license-audit.json
│   │   └── license-allowlist.json
│   └── ops/                  # Monitoring and smoke test scripts
├── scripts/
│   ├── bulk-ingest.mjs       # CLI script for batch ingestion
│   └── fetch-wikidata.ts     # CLI script for Wikidata queries
├── docs/                     # Project documentation (PRD, plans, runbooks)
├── .github/workflows/        # CI/CD pipelines
├── render.yaml               # Render.com deployment config (API + DB)
├── pnpm-workspace.yaml
└── package.json              # Root scripts (delegates to -r / --filter)
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Package manager | pnpm 10.6.0 (workspaces) |
| Node.js version | 20 |
| Frontend | React 19, TypeScript, Vite 6 |
| 2D Map | MapLibre GL 5 |
| 3D Globe | CesiumJS (lazy-loaded on demand) |
| Backend | Fastify 5, TypeScript, `tsx` for dev |
| Database | PostgreSQL 16 + PostGIS |
| DB client | `pg` (node-postgres, no ORM) |
| E2E testing | Playwright |
| CI/CD | GitHub Actions |
| API hosting | Render.com (free tier) |
| Frontend hosting | GitHub Pages |

---

## Development Commands

### Root (runs all workspaces)
```bash
pnpm install                 # Install all dependencies
pnpm -r build                # Build all packages
pnpm -r lint                 # Lint all packages
pnpm -r typecheck            # TypeScript check all packages
pnpm -r test                 # Run unit tests (stubs; not yet implemented)
```

### API (`apps/api`)
```bash
pnpm --filter @earthistory/api dev          # Start dev server (tsx watch, port 3001)
pnpm --filter @earthistory/api build        # Compile TypeScript → dist/
pnpm --filter @earthistory/api start        # Run compiled server (dist/server.js)
pnpm --filter @earthistory/api db:migrate   # Apply pending SQL migrations
pnpm --filter @earthistory/api ingest:seed  # Seed DB from infra/data/seed/
pnpm --filter @earthistory/api typecheck    # tsc --noEmit
```

### Web (`apps/web`)
```bash
pnpm --filter @earthistory/web dev           # Vite dev server (port 5173)
pnpm --filter @earthistory/web build         # Vite production build → apps/web/dist/
pnpm --filter @earthistory/web test:e2e      # Playwright headless
pnpm --filter @earthistory/web test:e2e:headed  # Playwright with browser UI
pnpm --filter @earthistory/web typecheck     # tsc --noEmit
```

### Local Database (Docker)
```bash
cd infra/db && docker-compose up -d         # Start PostgreSQL + PostGIS locally
bash infra/db/scripts/run-migrations.sh     # Apply all migrations
bash infra/db/scripts/run-seed.sh          # Load seed data
bash infra/db/scripts/verify-schema.sh     # Verify schema
```

---

## Environment Variables

### API (`apps/api`)
| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Optional | PostgreSQL connection string. If absent, falls back to mock data. |
| `CORS_ORIGINS` | Optional | Comma-separated allowed origins. Defaults to `http://localhost:5173,https://seasu.github.io`. |
| `PORT` | Optional | Server port. Defaults to 3001. |

### Web (`apps/web`)
| Variable | Required | Description |
|---|---|---|
| `VITE_API_BASE_URL` | Optional | API base URL. Defaults to `/api` (proxied by Vite dev server). |
| `VITE_BASE_PATH` | Optional | Vite base path. Set to `/earthistory/` for GitHub Pages deploy. |

**Vite dev proxy:** `/api/*` → `http://localhost:3001` (strips the `/api` prefix).

---

## API Endpoints

### Core Query
| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check; reports data source (postgres/mock) |
| `GET` | `/stats` | Returns `{ totalEvents: number }` |
| `GET` | `/events` | Query events by time range, category, bbox, YouTube filter |
| `GET` | `/regions` | Distinct region names |
| `GET` | `/sources` | Data source provenance records |
| `GET` | `/search` | Full-text search across title, summary, region |
| `GET` | `/openapi.json` | OpenAPI spec |

**`/events` query parameters:**
- `from` / `to` — Year integers (negative = BCE). Events overlap the window.
- `category` — Filter by category slug.
- `limit` — Max results (1–200, default 50).
- `hasYouTube` — `"true"` / `"false"` to filter by YouTube video presence.
- `bbox` — Bounding box `"minLng,minLat,maxLng,maxLat"` for spatial filter.
- `locale` — `"en"` or `"zh-TW"` for localized field names.

### Ingestion
| Method | Path | Description |
|---|---|---|
| `POST` | `/ingestion/topic` | Ingest events for a topic from Wikidata (legacy, direct insert) |
| `POST` | `/ingestion/preview` | Preview Wikidata events for a topic (no DB write) |
| `POST` | `/ingestion/confirm` | Confirm and insert previewed events by QID |
| `POST` | `/ingestion/batch` | Batch ingest a list of topics (or default curated list) |
| `GET` | `/ingestion/topics` | Returns the curated topic list |

### Admin
Registered under `/admin` prefix. See `apps/api/src/plugins/admin.ts`.

---

## Database Schema

PostgreSQL 16 + PostGIS. Migrations are in `infra/db/migrations/` applied in numeric order.

### `sources`
Tracks data provenance for every imported dataset.
```sql
id, source_name, source_url, license, attribution_text, retrieved_at, created_at, updated_at
UNIQUE(source_name, source_url)
```

### `events`
Core table. All historical events.
```sql
id, title, summary, category, region_name, precision_level, confidence_score,
time_start (INT), time_end (INT nullable),
location (GEOMETRY Point 4326),
source_id, source_url (UNIQUE),
image_url, image_attribution, wikipedia_url, youtube_video_id,
title_zh, summary_zh, region_name_zh,  -- i18n columns
created_at, updated_at
```

**Key constraints:**
- `precision_level` ∈ `{'year', 'decade', 'century'}`
- `confidence_score` ∈ `[0, 1]` (4 decimal places)
- `time_end >= time_start` when not null
- `source_url` is unique — used for `ON CONFLICT DO NOTHING` deduplication

**Indexes:** `time_start`, `time_end`, `category`, `precision_level`, spatial GIST on `location`, GIN trigram on `title` and `summary`, `source_url` unique index.

### `geo_layers`
Geographic reference layers (ODbL, kept separate from events).
```sql
id, layer_key (UNIQUE), display_name, license, source_id, metadata (JSONB), geom (MultiPolygon 4326)
```

### `topics`
Wikipedia/Wikidata category hierarchy cache.
```sql
id, name, wiki_id, type, language, parent_id, metadata (JSONB)
UNIQUE(name, language)
```
GIN trigram index on `name` for autocomplete.

---

## Naming Conventions

- **Database columns:** `snake_case`
- **API responses / TypeScript:** `camelCase` (mapped manually in query functions)
- **Time:** Integer year. Positive = CE, negative = BCE. Example: `-500` = 500 BCE.
- **Location:** WGS 84 (SRID 4326). PostGIS `ST_MakePoint(lng, lat)`. API returns `lat` and `lng` as separate floats.
- **i18n fields:** Original field (e.g. `title`) always holds English. Localized variants use `_zh` suffix (`title_zh`). Queries use `COALESCE(title_zh, title)` for `zh-TW` locale.
- **Deduplication:** `source_url` is the unique key for events. Use `ON CONFLICT (source_url) DO NOTHING`.

---

## Frontend Architecture

### State Management
No external state library. All state lives in `App.tsx` with React `useState`/`useEffect`. Key state:
- `sliderYear` (debounced to `activeYear` with 300 ms delay) — current timeline position
- `windowSize` — time window radius in years (±N years from activeYear)
- `events` — fetched from API, filtered client-side
- `filteredEvents` — derived from `events` + keyword/region/YouTube filters
- `selectedEventId` — which event card is shown

### Map Modes
`MapViewport.tsx` lazy-loads either `MapLibreProvider` (default, 2D) or `CesiumProvider` (3D) based on the `mode` prop. Both providers receive the same `events` array (id, title, category, lat, lng, timeStart, timeEnd) and `onEventSelect` callback.

### i18n
Custom implementation in `apps/web/src/i18n.tsx`. No library dependency.
- `LocaleProvider` wraps the app, detects locale from `localStorage` → browser language → defaults to `"en"`.
- `useLocale()` hook exposes: `locale`, `setLocale()`, `t(key, vars?)`, `formatYear(year)`, `tCategory(cat)`, `tPrecision(p)`.
- All UI strings are in the `strings` dictionary in `i18n.tsx`. Add new strings there.
- Category display names are in `categoryMap` in `i18n.tsx`.

### API Calls
Fetched in `App.tsx` using native `fetch` with `AbortController` for cleanup. The `VITE_API_BASE_URL` env var sets the base; it defaults to `/api` (proxied to port 3001 in dev).

---

## Wikidata Ingestion Pipeline

`WikidataService` (`apps/api/src/services/wikidata.service.ts`) is the sole external data fetcher.

1. **Search:** `searchTopic(query)` → Wikidata entity search API → returns `{ id: QID, label, description }`.
2. **Resolve related QIDs:** `resolveRelatedQids(qid)` → SPARQL to find country/subject/territory links.
3. **Fetch events:** `fetchRelatedEvents(qid)` → SPARQL query to Wikidata query service. Requires `P625` (coordinates) and either `P585` or `P580` (date). Prioritizes results with images/YouTube.
4. **Category mapping:** `CATEGORY_MAPPING` maps Wikidata `instance of` (P31) labels to app category slugs (war, politics, culture, civilization, exploration, science, technology, religion). Unknown types default to `"history"`.
5. **Rate limiting:** 5 requests/second via internal `RateLimiter`. External requests use `fetchWithRetry` with exponential backoff (max 3 retries, 429/5xx only).
6. **All Wikidata content is CC0** — safe for production use.

**Topic Ingest UI:** `TopicIngest.tsx` provides a two-step dialog: Preview (calls `/ingestion/preview`) → Confirm (calls `/ingestion/confirm`). After confirmation, `App.tsx` increments `reloadToken` to refresh event data.

---

## CI/CD Pipelines

| Workflow | Trigger | What it does |
|---|---|---|
| `ci.yml` | PRs, push to `main` | Install → lint → typecheck → test → build |
| `web-staging-deploy.yml` | Push to `main` | Build web with staging env vars → deploy to GitHub Pages |
| `render-blueprint-sync.yml` | Push to `main` | Sync `render.yaml` to Render.com |
| `staging-smoke.yml` | Scheduled / manual | Smoke tests against staging API |
| `usage-monitor.yml` | Scheduled | Checks Render/Supabase usage thresholds |

**Deployment flow:**
1. Merge to `main` triggers CI validation.
2. On success, `web-staging-deploy.yml` builds with `VITE_BASE_PATH=/earthistory/` and `VITE_API_BASE_URL=https://earthistory-api-staging.onrender.com` and deploys to GitHub Pages.
3. Render auto-deploys the API on push (via `autoDeploy: true` in `render.yaml`). Deploy runs `db:migrate` then `start`.

---

## Testing

### E2E Tests (Playwright)
Located in `apps/web/tests/e2e/critical-flows.spec.ts`. Tests use `page.route()` to mock API responses — no live API needed.

Key test scenarios:
- Timeline navigation, map mode switching (2D/3D)
- Category, region, keyword, YouTube filters
- Event selection and detail card display
- API error state + Retry button recovery

Run:
```bash
pnpm --filter @earthistory/web test:e2e
pnpm --filter @earthistory/web test:e2e:headed   # with browser
```

### Unit/Integration Tests
`pnpm -r test` runs stubs (`echo "TODO"`) for both `api` and `web`. Unit tests are not yet implemented.

---

## Data Governance Rules

These rules are mandatory and must not be violated:

1. **License policy:** Only `CC0` and `CC BY 4.0` (or equivalent) data enters production. `CC BY-SA`, `ODbL` (for events), and any unclear or ToS-restricted sources are rejected.
2. **Provenance:** Every event must have a `source_id` referencing the `sources` table with `source_name`, `source_url`, `license`, `attribution_text`, and `retrieved_at`.
3. **Deduplication:** Always use `ON CONFLICT (source_url) DO NOTHING` for event inserts.
4. **`geo_layers` separation:** Geographic layer data (often ODbL from OSM) is stored in `geo_layers`, never mixed into `events`. This avoids license obligation contamination.
5. **License audit:** Run `infra/data/normalized/license-audit.json` review before pushing data to production.

---

## Key Operational Scripts

| Script | Purpose |
|---|---|
| `infra/ops/staging-smoke.mjs` | Smoke test staging endpoints |
| `infra/ops/check-usage-thresholds.mjs` | Alert if Render/DB usage > 70% free tier |
| `infra/ops/generate-usage-snapshot.mjs` | Snapshot current usage metrics |
| `infra/ops/check-performance-thresholds.mjs` | Compare against performance baseline |
| `scripts/bulk-ingest.mjs` | CLI bulk ingestion |

---

## Important Docs

| File | Contents |
|---|---|
| `PRD.md` | Product requirements, tech decisions, cost strategy |
| `PLAN.md` | Active development plan (current sprint) |
| `CHECKPOINT.md` | Progress checkpoint (task completion status) |
| `docs/DEVELOPMENT_PLAN.md` | Human-readable milestone plan |
| `docs/DEVELOPMENT_PLAN_AI.md` | AI-executable task breakdown |
| `docs/AI_HANDOFF_RUNBOOK.md` | How to resume AI development sessions |
| `docs/DB_DEPLOYMENT.md` | Database deployment runbook |
| `docs/RELEASE_CHECKLIST.md` | Pre-release checklist |
| `docs/USAGE_MONITORING.md` | Usage monitoring runbook |

---

## Common Patterns and Conventions

### DB Query → API Response Mapping
All DB queries are written as raw SQL in plugin files. Column names are mapped from `snake_case` to `camelCase` manually in `.map()` calls. Example:
```typescript
{ regionName: row.region_name, timeStart: row.time_start }
```

### Graceful Fallback to Mock Data
Every query plugin method checks `getPool()` first. If `null` (no `DATABASE_URL`), it falls back to `apps/api/src/data/mock.ts`. This allows local dev without a database. Mock data should match the full `EventRecord` shape including all i18n fields.

### Locale in Queries
Pass `?locale=zh-TW` to any endpoint to get Traditional Chinese field values. Backend uses `COALESCE(title_zh, title)` pattern. Frontend always includes `locale` from `useLocale()` context in API calls.

### Adding a New Migration
1. Create `infra/db/migrations/XXXX_description.sql` with the next sequential number.
2. Migrations run in filename order via `apps/api/scripts/migrate.js`.
3. Use `IF NOT EXISTS` / `IF EXISTS` guards to make migrations idempotent.
4. Update mock data (`apps/api/src/data/mock.ts`) to reflect any new columns.

### Adding a New i18n String
1. Add the key to the `strings` dictionary in `apps/web/src/i18n.tsx` with both `en` and `zh-TW` values.
2. Use `t("myKey")` in components. Use `t("myKey", { count: n })` for parameterized strings (uses `{count}` placeholder in the string).

### Mock Data Update Rule
When adding database columns, always add corresponding fields to the mock `EventRecord` type and sample objects in `apps/api/src/data/mock.ts` to keep the fallback path consistent.

### Security Notes
- SQL injection prevention: All DB queries use parameterized queries (`$1`, `$2`, etc.). Never interpolate user input directly into SQL.
- SPARQL injection prevention: `isValidQid()` validates QID format (`/^Q\d+$/`) before embedding in SPARQL. Topic strings are passed via `encodeURIComponent`.
- Bbox validation: All four bbox values are validated as finite numbers before building the spatial query.
- Limit clamping: All `limit` params are clamped (events: 1–200, search: 1–100).
