# Earthistory 協作工作模式規範

更新日期: 2026-02-13  
用途: 讓單一主 agent 穩定交付，必要時可臨時支援但不採常態雙 agent 平行開發。

## 1. 協作目標
- 單一來源真相: 以 `docs/TICKET_BACKLOG.md` + GitHub Project 看板為準。
- 單工優先: 同時間只進行 1 張 In Progress 票，降低衝突成本。
- 可恢復: 任務中斷後可依文件與看板快速接續。

## 2. 角色切分
- Frontend 工作:
  - 主要負責 `apps/web`, `packages/shared`（前端型別使用面）
  - 建立 UI、地圖渲染整合、前端測試與部署驗證
- Backend 工作:
  - 主要負責 `apps/api`, `infra/data`, DB migration, ingestion
  - 建立 API、資料管線、後端測試與部署驗證
- 共用區 (`packages/shared`, `docs`):
  - 僅在對應票需要時修改
  - 若牽涉 API contract，先出「contract-first PR」

## 3. 領票與狀態流程
1. 從 `docs/TICKET_BACKLOG.md` 挑選最前面的 `P0 + Todo`。
2. 將卡片狀態改為 `In Progress`，填入 `Owner`。
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
- 優先維持單一負責面，避免一次跨多個子系統。
- 若需跨邊界:
  - 先開「接口票」(contract ticket)
  - 先合併 shared contract，再各自實作
- 若有外部支援者臨時介入:
  - 先留言看板卡片並標示檔案範圍
  - 主 agent 仍負責整體整合與最終 merge

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
- `BlockedBy`: ticket id 或 `none`
- `ContractImpact`: `yes/no`
