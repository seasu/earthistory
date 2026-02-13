# DB Deployment (T5.3)

目標: 用免費方案部署 PostgreSQL + PostGIS，並確認 Earthistory schema 完整。

## Platform
- Provider: Supabase Free
- DB engine: PostgreSQL
- Required extensions: `postgis`, `pg_trgm`, `btree_gist`

## 1. 建立 Supabase 專案
1. 開啟 https://supabase.com/dashboard
2. `New project`
3. 設定:
   - Organization: 選你自己的 org
   - Name: `earthistory-db-staging`
   - Database Password: 設一組新密碼
   - Region: 選靠近前端/API 的區域
4. 等待專案初始化完成

## 2. 取得連線字串
1. 進入 project -> `Settings` -> `Database`
2. 找到 `Connection string` (URI)
3. 複製後替換 `<password>`
4. 本機設定:

```bash
export DATABASE_URL='postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres?sslmode=require'
```

## 3. 套用 migrations
在 repo root 執行:

```bash
bash infra/db/scripts/run-migrations.sh
```

## 4. 驗證 schema 完整
在 repo root 執行:

```bash
bash infra/db/scripts/verify-schema.sh
```

預期:
1. extensions 三項都存在
2. tables 三張都存在: `sources`, `geo_layers`, `events`
3. `events` 索引完整列出（含 gist/gin/brin）

## 5. 提供給 API 的環境變數
當 API 進入真實 DB 階段時，將 Render service 增加:
- `DATABASE_URL=<supabase-connection-string>`

目前 API 仍以 mock data 為主，先保留此變數供下一階段接線使用。

## 6. 常見問題
- `psql: command not found`
  - 安裝 PostgreSQL client 後重試。
- `no pg_hba.conf entry` 或 SSL 相關錯誤
  - 確認 URL 有 `?sslmode=require`。
- `permission denied to create extension postgis`
  - 確認使用 Supabase 預設管理帳號連線（`postgres`）。
