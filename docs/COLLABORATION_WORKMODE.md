# Earthistory 可分工協作規範 (Dual-Agent)

更新日期: 2026-02-13  
用途: 讓兩個 AI agent 可平行開發且可持續交接，避免衝突與重工。

## 1. 協作目標
- 單一來源真相: 以 `docs/TICKET_BACKLOG.md` + GitHub Project 看板為準。
- 平行開發: Frontend 與 Backend 各自領票、各自 PR。
- 可恢復: 任一 agent 中斷後，另一個 agent 可依文件與看板接手。

## 2. 角色切分
- Frontend agent:
  - 主要負責 `apps/web`, `packages/shared`（前端型別使用面）
  - 建立 UI、地圖渲染整合、前端測試與部署驗證
- Backend agent:
  - 主要負責 `apps/api`, `infra/data`, DB migration, ingestion
  - 建立 API、資料管線、後端測試與部署驗證
- 共用區 (`packages/shared`, `docs`):
  - 僅在對應票需要時修改
  - 若牽涉 API contract，先出「contract-first PR」

## 3. 領票與狀態流程
1. 從 `docs/TICKET_BACKLOG.md` 挑選最前面的 `P0 + Todo`。
2. 將卡片狀態改為 `In Progress`，填入 `Owner` 與 `Agent`。
3. 建分支: `codex/<ticket-id>-<short-name>`。
4. 完成驗收後改為 `Review`，PR merge 後改為 `Done`。

## 4. 分支與 PR 規範
- 一票一分支、一票一 PR，不混入其他票修改。
- PR 標題格式:
  - `[<TicketID>] <scope>: <summary>`
  - 例: `[T4.2] web: integrate maplibre real map`
- PR 必附:
  - 變更摘要
  - 驗證指令與結果
  - 風險與回滾
  - 文件同步清單

## 5. 衝突避免規則
- Frontend 不直接修改 backend runtime 邏輯；Backend 不直接改前端 UI。
- 若需跨邊界:
  - 先開「接口票」(contract ticket)
  - 先合併 shared contract，再各自實作
- 同一檔案若已被另一 agent 佔用:
  - 先留言看板卡片並暫停改檔
  - 協調後再繼續，避免互蓋

## 6. Contract-First 規範
- API 變更流程:
  1. 更新 `packages/shared` 型別或 schema
  2. 更新 OpenAPI / 文件
  3. Backend 實作
  4. Frontend 串接
- 未完成 contract 對齊前，不可在 main 合併 breaking change。

## 7. 同步節奏
- 每完成一張票必做:
  - 更新 `CHECKPOINT.md`
  - 更新看板欄位 (`Status`, `Progress`, `Owner`, `BlockedBy`)
  - 更新必要文件 (`PRD.md`, plan docs)
- 每日收工前:
  - 寫明 `Next` 與 `Blockers`
  - 確認下一張可直接接續的票

## 8. 品質門檻
- 必須通過:
  - `pnpm -r lint`
  - `pnpm -r typecheck`
  - `pnpm -r test`
- 任何失敗:
  - 不得 merge
  - 在票上標記 `Blocked` 並註明修復計畫

## 9. 例外與緊急處理
- 緊急修復票可插隊，但需:
  - 看板標記 `P0-urgent`
  - 在 PR 說明風險與影響範圍
  - 完成後補回測試與文件

## 10. 最小看板欄位（新增）
- `Owner`: 人/agent 名稱
- `Agent`: `codex` 或 `antigravity`
- `BlockedBy`: ticket id 或 `none`
- `ContractImpact`: `yes/no`
