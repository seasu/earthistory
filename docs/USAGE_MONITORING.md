# Usage Monitoring (T5.4)

目標: 追蹤免費額度使用率，並在 70%/90% 門檻時出現警示。

## 監控規則
- `>= 70%`: Warning
- `>= 90%`: Critical (workflow 失敗)

## 已實作內容
- Workflow: `.github/workflows/usage-monitor.yml`
- Snapshot generator: `infra/ops/generate-usage-snapshot.mjs`
- Threshold checker: `infra/ops/check-usage-thresholds.mjs`

## 你需要先設定的 GitHub Repository Variables
到 GitHub Repo -> `Settings` -> `Secrets and variables` -> `Actions` -> `Variables`

新增:
1. `FRONTEND_USAGE_PCT` (0-100)
2. `API_USAGE_PCT` (0-100)
3. `DB_USAGE_PCT` (0-100)

## 來源建議
- `FRONTEND_USAGE_PCT`: GitHub Pages/帶寬或你定義的前端 quota 百分比
- `API_USAGE_PCT`: Render Free plan 使用率
- `DB_USAGE_PCT`: Supabase Free plan 使用率（例如 DB size / quota）

## 觸發方式
1. 手動: Actions -> `Usage Monitor` -> `Run workflow`
2. 排程: 每日 UTC 01:00 自動執行

## 成果判讀
- Actions log 會列出每個服務目前百分比與狀態
- Artifact `usage-snapshot` 會保存當次快照
- 若出現 `Critical threshold reached (>=90%)`，該 run 會失敗
