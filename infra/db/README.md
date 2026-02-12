# DB Bootstrap (T1.1)

This folder contains PostgreSQL/PostGIS bootstrap assets.

## 1. Start local database

```bash
docker compose -f infra/db/docker-compose.yml up -d
```

## 2. Apply extension bootstrap migration

```bash
psql "postgresql://earthistory:earthistory@localhost:5432/earthistory" \
  -f infra/db/migrations/0001_init_extensions.sql
```

## 3. Verify extensions

```bash
psql "postgresql://earthistory:earthistory@localhost:5432/earthistory" \
  -c "SELECT extname FROM pg_extension WHERE extname IN ('postgis','pg_trgm','btree_gist') ORDER BY extname;"
```

The migration is idempotent (`IF NOT EXISTS`), so it can be safely re-run.
