# API Deployment (T5.2)

目標: 把 `apps/api` 部署到 Render Free，拿到可公開呼叫的 API URL。

## 你要先準備
1. GitHub 帳號（且可存取 repo `seasu/earthistory`）
2. Render 帳號: https://dashboard.render.com/register
3. repo 內已有 `render.yaml`（本專案已提供）

## 建議做法（最簡單）: 用 Blueprint 自動建立
1. 登入 Render Dashboard
2. 右上角 `New +` -> `Blueprint`
3. 第一次使用會要求連 GitHub，按 `Connect GitHub`
4. 授權 Render 讀取 repo，選 `seasu/earthistory`
5. Render 會偵測到 `render.yaml`，畫面會出現 service 預覽:
   - Name: `earthistory-api-staging`
   - Type: `Web Service`
   - Plan: `Free`
6. 按 `Apply` / `Create Blueprint` 開始部署

## 你應該看到的設定值（對照用）
來自 `render.yaml`，正常情況不需要手動改:

1. `buildCommand`:
`corepack pnpm install --frozen-lockfile=false && corepack pnpm --filter @earthistory/api build`
2. `startCommand`:
`corepack pnpm --filter @earthistory/api start`
3. `healthCheckPath`:
`/health`
4. env vars:
`NODE_VERSION=20`
`CORS_ORIGINS=https://seasu.github.io,http://localhost:5173`

## 部署完成後先做這 4 個檢查
把 `<your-render-url>` 換成你的實際網址（通常是 `https://earthistory-api-staging.onrender.com`）:

1. `<your-render-url>/health`
2. `<your-render-url>/events`
3. `<your-render-url>/regions`
4. `<your-render-url>/openapi.json`

只要都能回 JSON，就代表 API 可公開呼叫。

## 把前端接到這個 API
本專案前端部署 workflow 檔是:
`/.github/workflows/web-staging-deploy.yml`

其中環境變數 `VITE_API_BASE_URL` 要設成你的 Render URL，例如:
`https://earthistory-api-staging.onrender.com`

## 若 Blueprint 失敗，改用手動建立（備援）
1. `New +` -> `Web Service`
2. 連到 `seasu/earthistory`
3. 依序填:
   - Name: `earthistory-api-staging`
   - Runtime: `Node`
   - Root Directory: 留空（repo root）
   - Build Command: `corepack pnpm install --frozen-lockfile=false && corepack pnpm --filter @earthistory/api build`
   - Start Command: `corepack pnpm --filter @earthistory/api start`
   - Plan: `Free`
4. Environment Variables 新增:
   - `NODE_VERSION` = `20`
   - `CORS_ORIGINS` = `https://seasu.github.io,http://localhost:5173`
5. 建立後等待第一次 deploy 完成，再做 `/health` 檢查

## 回滾
1. 進入該服務 -> `Deploys`
2. 找上一個成功版本
3. 點 `Redeploy`
4. 再驗證 `/health`、`/events`
