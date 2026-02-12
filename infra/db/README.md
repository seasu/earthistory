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

## 3. Apply core tables migration

```bash
psql "postgresql://earthistory:earthistory@localhost:5432/earthistory" \
  -f infra/db/migrations/0002_core_tables.sql
```

## 4. Verify extensions

```bash
psql "postgresql://earthistory:earthistory@localhost:5432/earthistory" \
  -c "SELECT extname FROM pg_extension WHERE extname IN ('postgis','pg_trgm','btree_gist') ORDER BY extname;"
```

## 5. Verify core tables

```bash
psql "postgresql://earthistory:earthistory@localhost:5432/earthistory" \
  -c "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename IN ('sources','geo_layers','events') ORDER BY tablename;"
```

## 6. Apply index strategy migration

```bash
psql "postgresql://earthistory:earthistory@localhost:5432/earthistory" \
  -f infra/db/migrations/0003_index_strategy.sql
```

## 7. Verify index set

```bash
psql "postgresql://earthistory:earthistory@localhost:5432/earthistory" \
  -c "SELECT indexname FROM pg_indexes WHERE schemaname='public' AND tablename='events' ORDER BY indexname;"
```

Migrations are idempotent (`IF NOT EXISTS`), so they can be safely re-run.
