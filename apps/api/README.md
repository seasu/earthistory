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
