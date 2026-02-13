# Frontend Deployment (T5.1)

目標: 以免費方案部署 `apps/web` 並提供 staging URL。

## Platform
- Provider: GitHub Pages (free)
- Workflow: `.github/workflows/web-staging-deploy.yml`
- URL: `https://seasu.github.io/earthistory/`

## One-time Setup
1. GitHub Repository Settings -> Pages
2. Build and deployment source 設定為 `GitHub Actions`
3. 確認 repository 為 public（或你的方案允許 private pages）

## Deploy Flow
1. push 到 `main` 觸發 workflow
2. workflow 會 build `@earthistory/web`
3. artifact 上傳後由 `actions/deploy-pages` 發佈
4. 在 workflow 的 `Deploy to GitHub Pages` step 可看到 page URL

## API Endpoint
- 預設 web 使用 `/api`。
- 如果 staging API 已上線，build 時注入 `VITE_API_BASE_URL` 指到公開 API。
- 目前 staging API: `https://earthistory-api-staging.onrender.com`

## Verification
1. 開啟 staging URL
2. 頁面可載入並可切換 `Cesium/MapLibre`
3. Timeline/Filters/Event panel 可互動
4. 若 API 尚未上線，應顯示可理解的錯誤與 retry 狀態（T4.4）
