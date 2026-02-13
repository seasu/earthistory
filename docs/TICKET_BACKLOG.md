# Earthistory Ticket Backlog

更新日期: 2026-02-13  
用途: AI 按票實作的唯一票務來源（再同步到 GitHub Projects）

## 狀態定義
- `Todo`: 未開始
- `In Progress`: 正在實作（每位 AI 一次只能 1 張）
- `Review`: 等待 code review / 驗收
- `Done`: 完成
- `Blocked`: 有阻塞

## Tickets
| Ticket | Title | Sprint | Track | Priority | Size | Status | Acceptance |
|---|---|---|---|---|---:|---|---|
| T0.1 | Monorepo workspace 初始化 | S0 | DevOps | P0 | 3 | Done | `apps/web`,`apps/api`,`packages/shared` 可建置 |
| T0.2 | Lint/Typecheck/Test 命令基線 | S0 | DevOps | P0 | 2 | Done | `pnpm -r lint/typecheck/test` 可執行 |
| T0.3 | CI workflow baseline | S0 | DevOps | P0 | 3 | Done | PR 觸發 `lint+typecheck+test+build` |
| T1.1 | Postgres + PostGIS migration 初始化 | S1 | Backend | P0 | 3 | Done | migration 可重複執行 |
| T1.2 | 核心資料表建立 (`events`,`geo_layers`,`sources`) | S1 | Data | P0 | 5 | Done | schema 與文件一致 |
| T1.3 | 核心索引策略（時間/地理/全文） | S1 | Data | P1 | 3 | Done | 查詢計畫可用 index |
| T2.1 | Fastify 模組邊界骨架 | S1 | Backend | P0 | 3 | Done | `query/search/ingestion/admin` 模組存在 |
| T2.2 | API v1 端點實作 | S1 | Backend | P0 | 5 | Done | `/events,/search,/regions,/sources` 可回應 |
| T2.3 | OpenAPI 文件產生 | S1 | Backend | P1 | 2 | Done | OpenAPI 與實作一致 |
| T3.1 | Seed ingestion script v1 | S2 | Data | P0 | 5 | Done | 可匯入合法資料來源 |
| T3.2 | Provenance 欄位落地 | S2 | Data | P0 | 3 | Done | 每筆資料含來源追溯欄位 |
| T3.3 | License gate 規則 | S2 | Data | P0 | 3 | Done | 不合規資料被拒絕 |
| T4.1 | Web app 骨架與 layout | S2 | Frontend | P0 | 3 | Done | 首頁可載入與基本導覽 |
| T4.2 | Map provider 抽象層 (Cesium/MapLibre) | S2 | Frontend | P0 | 5 | Done | 2D/3D 可切換 |
| T4.3 | Timeline + Filters + Event Panel | S3 | Frontend | P0 | 5 | Done | 可切年代、篩選、看事件詳情 |
| T4.4 | API 整合與錯誤狀態 | S3 | Frontend | P1 | 3 | Done | Loading/Empty/Error 完整 |
| T5.1 | Frontend 免費雲端部署 | S4 | DevOps | P0 | 3 | Done | 產生 staging URL |
| T5.2 | API 免費雲端部署 | S4 | DevOps | P0 | 3 | Done | API 可公開呼叫 |
| T5.3 | DB 免費方案部署 | S4 | DevOps | P0 | 3 | Done | DB 可連線且 schema 完整 |
| T5.4 | 使用量監控與額度預警 | S4 | DevOps | P1 | 2 | Done | 70/90% usage 規則可追蹤 |
| T6.1 | MVP 任務流程手動驗收腳本與清單 | S5 | QA | P0 | 3 | In Progress | 3 分鐘流程驗收可重複執行且可記錄結果 |
| T6.2 | 關鍵使用流程 E2E 測試 | S5 | QA | P0 | 5 | Todo | 時間軸/點擊事件/2D-3D 切換/API 錯誤狀態有 E2E |
| T6.3 | 前後端效能基線與監測門檻 | S5 | DevOps | P1 | 3 | Todo | 產出首屏、互動延遲、API P95 基線與告警門檻 |
| T6.4 | Rollback drill 演練與紀錄 | S5 | DevOps | P0 | 2 | Todo | 前端/API/DB 各完成 1 次回滾演練並留存紀錄 |

## 整體進度
- Total Points: 80
- Done Points: 67
- Overall Progress: 84%
