# Project Kickoff Template (Reusable)

用途: 新專案啟動時直接複製使用。  
做法: 將 `<...>` 欄位填入專案資訊。

## 1. 專案基本資訊
- Project: `<project_name>`
- Owner: `<owner>`
- Repo: `<repo_url>`
- Branch strategy: `codex/<scope>-<desc>`
- Target timeline: `<weeks>`

## 2. 產品目標
- 核心問題: `<problem>`
- 核心使用者: `<users>`
- MVP 目標: `<mvp_goal>`
- 非目標: `<non_goals>`

## 3. 技術與架構定案
- Frontend: `<stack>`
- Backend: `<stack>`
- DB: `<stack>`
- Search: `<stack>`
- Architecture style: `<modular monolith / ...>`
- 可替換策略: `<how_to_avoid_rewrite>`

## 4. 資料與授權策略
- Data policy: `<license_policy>`
- Allowed licenses: `<licenses>`
- Disallowed sources: `<rules>`
- Required provenance fields:
  - `source_name`
  - `source_url`
  - `license`
  - `attribution_text`
  - `retrieved_at`

## 5. 成本與部署策略
- Cost target: `<$0 / budget>`
- Cloud plan: `<free_tier_stack>`
- Threshold policy:
  - Warn at `<70%>`
  - Freeze/optimize at `<90%>`

## 6. 文件清單
- `PRD.md`
- `MARKET_RESEARCH.md`
- `DEVELOPMENT_PLAN.md`
- `DEVELOPMENT_PLAN_AI.md`
- `AI_HANDOFF_RUNBOOK.md`
- `KANBAN_SETUP.md`
- `CHECKPOINT.md`

## 7. 開發標準
- 每個 PR 必須:
  - 變更摘要
  - 測試證據
  - 風險/回滾
  - Docs Sync
- DoD:
  - 測試通過
  - 文件同步
  - 可部署驗證

## 8. AI 開發執行規範
- 按 `TaskID` 小步提交
- 中斷前更新 `CHECKPOINT.md`
- 報告格式固定:
  - Scope
  - Changes
  - Verification
  - Risks
  - Docs Sync
  - Next

## 9. 看板規範
- Tool: `<GitHub Projects / Trello / ...>`
- Columns: `Todo / In Progress / Review / Done / Blocked`
- 每卡需有:
  - TaskID
  - Acceptance Criteria
  - DoD checklist
