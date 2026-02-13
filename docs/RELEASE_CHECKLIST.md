# MVP Release Checklist

## 1. 部署前
- [ ] `main` 已合併所有目標變更
- [ ] `CI` workflow 全綠
- [ ] `Web Staging Deploy` 成功
- [ ] Render API 最新 deploy 成功

## 2. 部署後自動檢查
- [ ] `Staging Smoke` workflow 成功
- [ ] `Usage Monitor` workflow 可執行

## 3. 部署後人工驗收
- [ ] 開啟 `https://seasu.github.io/earthistory/` 成功載入
- [ ] Timeline + Filters + Event Panel 可互動
- [ ] `https://earthistory-api-staging.onrender.com/health` 回傳 `{ "ok": true }`
- [ ] `https://earthistory-api-staging.onrender.com/events` 回傳事件清單
- [ ] `https://earthistory-api-staging.onrender.com/openapi.json` 可開啟

## 4. 文件同步
- [ ] `CHECKPOINT.md` 已更新
- [ ] `docs/BOARD_PROGRESS.md` 已更新
- [ ] `docs/TICKET_BACKLOG.md` 已更新
- [ ] 部署文件（frontend/api/db/monitoring）已反映最新配置

## 5. 回滾準備
- [ ] 確認 GitHub Pages 可重跑上一版 workflow
- [ ] 確認 Render 可在 Deploys 點選 `Redeploy` 上一版
- [ ] 確認 rollback 後 smoke test 仍可通過
