# API Skeleton (T2.1)

This service defines the initial Fastify module boundaries:

- `query`
- `search`
- `ingestion`
- `admin`

Run locally:

```bash
pnpm --filter @earthistory/api dev
```

Production run:

```bash
pnpm --filter @earthistory/api build
pnpm --filter @earthistory/api start
```

Core endpoints (T2.2):

- `GET /events`
- `GET /search?q=<keyword>`
- `GET /regions`
- `GET /sources`

OpenAPI document (T2.3):

- `GET /openapi.json`

Seed ingestion (T3.1):

```bash
pnpm --filter @earthistory/api ingest:seed
```

License gate (T3.3):

- allowlist: `infra/data/license-allowlist.json`
- audit output: `infra/data/normalized/license-audit.json`

T5.2 API deploy:

- Provider: Render free web service
- Config: `render.yaml`
- Staging URL: `https://earthistory-api-staging.onrender.com`
- Env:
  - `PORT` (provided by platform)
  - `CORS_ORIGINS` (comma separated allowlist)

T5.3 DB deploy:

- Provider: Supabase Free (recommended)
- Runbook: `docs/DB_DEPLOYMENT.md`
- DB scripts:
  - `infra/db/scripts/run-migrations.sh`
  - `infra/db/scripts/verify-schema.sh`
