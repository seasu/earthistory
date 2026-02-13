# MVP Release Checklist

## 1. 部署前
- [x] `main` 已合併所有目標變更
- [x] `CI` workflow 全綠
- [x] `Web Staging Deploy` 成功
- [x] Render API 最新 deploy 成功

## 2. 部署後自動檢查
- [x] `Staging Smoke` workflow 成功
- [x] `Usage Monitor` workflow 可執行

## 3. 部署後人工驗收
- [x] 開啟 `https://seasu.github.io/earthistory/` 成功載入
- [ ] Timeline + Filters + Event Panel 可互動
- [x] `https://earthistory-api-staging.onrender.com/health` 回傳 `{ "ok": true }`
- [x] `https://earthistory-api-staging.onrender.com/events` 回傳事件清單
- [x] `https://earthistory-api-staging.onrender.com/openapi.json` 可開啟

## 4. 文件同步
- [x] `CHECKPOINT.md` 已更新
- [x] `docs/BOARD_PROGRESS.md` 已更新
- [x] `docs/TICKET_BACKLOG.md` 已更新
- [x] 部署文件（frontend/api/db/monitoring）已反映最新配置

## 5. 回滾準備
- [ ] 確認 GitHub Pages 可重跑上一版 workflow
- [ ] 確認 Render 可在 Deploys 點選 `Redeploy` 上一版
- [ ] 確認 rollback 後 smoke test 仍可通過

## 6. 驗證紀錄 (2026-02-13)
- CI success: https://github.com/seasu/earthistory/actions/runs/21983107423
- Web Staging Deploy success: https://github.com/seasu/earthistory/actions/runs/21983107450
- Staging Smoke success: https://github.com/seasu/earthistory/actions/runs/21983119678
- Usage Monitor success: https://github.com/seasu/earthistory/actions/runs/21990051012
- Local smoke command:
  - `STAGING_WEB_URL='https://seasu.github.io/earthistory/' STAGING_API_URL='https://earthistory-api-staging.onrender.com' node infra/ops/staging-smoke.mjs`
