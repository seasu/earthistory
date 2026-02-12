# Earthistory Development Plan (Human Version)

更新日期: 2026-02-12  
讀者: 專案 Owner / PM / Tech Lead

## 1. 目標與原則
- 4-6 週交付可公開測試的 MVP。
- 以 `$0/月` 免費雲端優先，必要時再升級。
- 架構採 `modular monolith`，避免早期過度拆分與重構。

## 2. MVP 交付內容
- 3D/2D 地圖瀏覽（Cesium + MapLibre）。
- 時間軸切換、地區點擊、事件詳情。
- 事件 API、搜尋與篩選。
- 合規資料匯入與授權標示。
- 基礎雲端部署與監控。

## 3. 里程碑 (5 Sprint)
- Sprint 0: repo 初始化、schema v1、CI 基線。
- Sprint 1: API v1 + DB + seed ingestion。
- Sprint 2: 前端核心互動（地圖/時間軸/詳情）。
- Sprint 3: 搜尋篩選、效能優化、授權展示。
- Sprint 4: 封測、修復、部署穩定化、MVP release。

## 4. 工程管理標準
- 分支: `codex/<scope>-<desc>`
- 每個 PR 必須附:
  - 變更摘要
  - 測試證據
  - 風險與回滾
  - 影響範圍
- DoD:
  - 需求符合驗收標準
  - 測試與 CI 全綠
  - 文件同步更新
  - 可部署且可重現

## 5. 風險與對策
- 免費額度超限: 70% 預警，90% 先凍結新功能。
- 地圖效能風險: chunk loading + 聚合查詢。
- 授權風險: source gate + 分層儲存 + 發布前稽核。

## 6. 決策待確認
- Monorepo: `pnpm workspace`
- Backend: `Fastify + plugin`
- E2E: `Playwright`
- Sprint 週期: `1 週`

## 7. AI 執行版對照
- AI 專用任務拆解、執行順序、驗收清單請看 `DEVELOPMENT_PLAN_AI.md`。

## 8. 文件即時同步規則
- 每次開發提交都必須檢查:
  - `PRD.md` 是否需更新（需求/架構/API/授權變更）
  - `DEVELOPMENT_PLAN.md` 是否需更新（里程碑/流程/標準變更）
  - `DEVELOPMENT_PLAN_AI.md` 是否需更新（任務拆解/驗收條件變更）
- 規則:
  - 文件更新與程式碼變更同一個 PR 提交，不延後補文件。
  - 若文件衝突，先以 `PRD.md` 決策為準，再回填兩份計畫文件。

## 9. 中斷續跑與看板追蹤
- AI 中斷續跑規範: `AI_HANDOFF_RUNBOOK.md`
- 免費看板規範: `KANBAN_SETUP.md`
- 補充要求:
  - 每次開發 session 結束前必須更新 `CHECKPOINT.md`
  - 看板卡片需對應 `TaskID`（T0~T5）並即時更新狀態
