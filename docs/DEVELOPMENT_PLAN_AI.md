# Earthistory Development Plan (AI Execution Version)

更新日期: 2026-02-13  
用途: 給 AI agent 逐步執行，避免任務遺漏與重工

## 0. Execution Contract
- 目標: 交付 MVP，不偏離 `PRD.md` 與 `docs/DEVELOPMENT_PLAN.md`。
- 原則:
  - 小步提交，單一責任 PR。
  - 任何 schema/API 變更先更新文件。
  - 不可破壞既有 contract，僅向後相容擴充。
- 禁止:
  - 未經確認引入付費雲端依賴。
  - 未標授權來源的資料進入 production data。
  - 同一時間開工超過 1 張票（必須一張一張做）。
- 多 agent 協作時:
  - 需遵守 `docs/COLLABORATION_WORKMODE.md`
  - 先領票再開發，禁止未領票直接改程式

## 1. Repository Structure (Target)
- `apps/web`: React + Vite + TypeScript
- `apps/api`: Fastify + TypeScript
- `packages/shared`: 型別、schema、常數
- `infra`: deployment/config/scripts
- `docs`: 架構與操作文件 (可選)

## 2. Task Sequence
執行方式:
- 先讀 `docs/TICKET_BACKLOG.md`，挑選「最前面的 P0 + Todo」票。
- 將該票狀態改為 `In Progress` 後才可開始實作。
- 完成並驗收後改為 `Done`，再拿下一張票。

## T0 初始化與基線
- T0.1 建立 monorepo 與 workspace 管理
- T0.2 建立 lint/typecheck/test 命令
- T0.3 建立 CI workflow (`lint`, `typecheck`, `test`, `build`)
- Output:
  - 可執行的 `pnpm i && pnpm -r build`
  - CI 可跑通最小 pipeline
- Acceptance:
  - 本地與 CI 都可成功執行 baseline jobs

## T1 Database + Schema v1
- T1.1 建立 PostgreSQL + PostGIS migration
- T1.2 建立核心表: `events`, `geo_layers`, `sources`
- T1.3 建立 index: 時間、地理、全文搜尋
- Output:
  - migration 檔與 rollback 策略
  - schema 文件
- Acceptance:
  - migration 可重複執行且結果一致

## T2 API v1
- T2.1 建立 Fastify 模組邊界: `query`, `search`, `ingestion`, `admin`
- T2.2 實作 endpoints:
  - `GET /events`
  - `GET /search`
  - `GET /regions`
  - `GET /sources`
- T2.3 產生 `OpenAPI` 文件
- Output:
  - API v1 可查詢 seed data
- Acceptance:
  - integration test 通過
  - OpenAPI 與實作一致

## T3 Ingestion + Legal Gate
- T3.1 匯入腳本（CC0/CC BY/ODbL 分層）
- T3.2 provenance 欄位完整寫入
- T3.3 license gate（拒絕不相容來源）
- Output:
  - 可重複執行的 ingestion job
  - audit log
- Acceptance:
  - 不合規資料無法進入 production tables

## T4 Frontend MVP
- T4.1 建立 `apps/web` 骨架與 UI layout
- T4.2 地圖抽象層: 3D(Cesium)/2D(MapLibre)
- T4.3 Timeline + Filters + Event Panel
- T4.4 串接 API 與錯誤狀態
- Output:
  - 可互動 MVP 頁面
- Acceptance:
  - 可完成 3 分鐘 MVP 任務流程（PRD 定義）

## T5 Deploy + Ops
- T5.1 Frontend deploy (GitHub Pages)
- T5.2 API deploy (Render Free)
- T5.3 DB deploy (Supabase Free/Neon Free)
- T5.4 使用量監控與額度預警
- Output:
  - staging URL
  - runbook
- Acceptance:
  - 能穩定部署與回滾
  - 70/90% usage threshold 可追蹤

## 3. Quality Gates
- 每個 T 階段都需:
  - 單元測試或整合測試
  - 文件更新 (`PRD.md` 或對應 docs)
  - 風險與回滾方案
- 若測試未過:
  - 不可合併
  - 優先修復，不進下一階段

## 3.1 Documentation Sync Gate (Mandatory)
- 每次提交前必做:
  - 檢查是否影響 `PRD.md`
  - 檢查是否影響 `docs/DEVELOPMENT_PLAN.md`
  - 檢查是否影響 `docs/DEVELOPMENT_PLAN_AI.md`
- 合併條件:
  - 程式碼與文件同 PR 同步
  - 若有規格差異，以 `PRD.md` 為準，先更新規格再合併

## 4. Reporting Format (AI 每次回報)
- `Scope`: 本次完成項目
- `Changes`: 檔案與摘要
- `Verification`: 測試/指令結果
- `Risks`: 已知風險
- `Next`: 下一個最小可交付步驟
- `Docs Sync`: 本次同步更新了哪些文件，若無更新需說明原因

## 5. Definition of Done (MVP)
- 功能:
  - 地圖模式可切換
  - 時間軸可切換
  - 點區域可查事件並展示來源
- 工程:
  - CI 全綠
  - staging 可用
  - 文件齊全
- 合規:
  - 資料來源符合白名單政策
  - attribution 可追溯
