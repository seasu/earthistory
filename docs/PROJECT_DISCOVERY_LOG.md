# Earthistory Conversation & Decision Log

更新日期: 2026-02-12
目的: 記錄本次從需求討論到開發啟動前的主要決策歷程。

## 1. 初始需求
- 目標產品: 類 Google Earth 介面，透過年代切換瀏覽地球各區域歷史事件。
- 主要訴求:
  - 成本低
  - 可長期維護
  - 不觸法/不侵權
  - 可由 AI 持續開發

## 2. 關鍵決策摘要
- Git 分支建立: `codex/prd-setup`
- PRD 建立並持續迭代: `PRD.md`
- 市場調查獨立: `docs/MARKET_RESEARCH.md`
- 開發計畫雙版本:
  - 人類版: `docs/DEVELOPMENT_PLAN.md`
  - AI 執行版: `docs/DEVELOPMENT_PLAN_AI.md`
- AI 中斷續跑規範: `docs/AI_HANDOFF_RUNBOOK.md`
- 免費看板規範: `docs/KANBAN_SETUP.md`

## 3. 產品與技術方向決策
- 地圖技術:
  - 主體採 `CesiumJS`（3D）
  - 輔助採 `MapLibre`（2D）
  - Google Maps 僅保留未來輔助用途，不作主引擎
- 後端:
  - `Node.js + Fastify + TypeScript`
  - `PostgreSQL + PostGIS`
- 架構策略:
  - `modular monolith`
  - 先穩 API/schema，再漸進擴充

## 4. 資料與法務決策
- 資料政策定案: `嚴格開放授權-only`
- 核心資料白名單: `CC0`, `CC BY 4.0`
- 地理圖層: `ODbL` 可用但需分層/分庫
- 禁止上線資料: `CC BY-SA`、授權不明、限制再散布來源

## 5. 成本與部署決策
- 目標: MVP 優先 `$0/月`
- 部署主軸:
  - Cloudflare Pages/Workers（免費額度）
  - Supabase Free 或 Neon Free（Postgres）
- 成本控制:
  - 70% 配額預警
  - 90% 先凍結新功能做優化

## 6. 開發流程決策
- 程式碼與文件必須同 PR 同步
- 以 `TaskID (T0~T5)` 管理 AI 開發進度
- 每次 session 結束都更新 `CHECKPOINT.md`，確保可恢復

## 7. 後續可重用資產
- 本次流程樣板請參考: `docs/PROJECT_KICKOFF_TEMPLATE.md`
- AI 啟動提示詞請參考: `docs/AI_DEV_PROMPT.md`
