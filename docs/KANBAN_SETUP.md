# Earthistory Kanban Setup (Free)

更新日期: 2026-02-12
工具: GitHub Projects (Free)

## 1. 目標
- 用免費看板可視化整個開發進度。
- 每張卡片對應 `DEVELOPMENT_PLAN_AI.md` 的 task（T0~T5）。

## 2. 建議欄位
- `Status`: Todo / In Progress / Review / Done / Blocked
- `Priority`: P0 / P1 / P2
- `Track`: Product / Data / Backend / Frontend / DevOps
- `Sprint`: S0 / S1 / S2 / S3 / S4
- `TaskID`: 例如 `T2.1`
- `Size`: 1 / 2 / 3 / 5 / 8（story points）
- `Progress`: 0 / 25 / 50 / 75 / 100（卡片進度）

## 3. 建議欄位視圖
- Board View: 依 `Status` 分欄
- Table View: 依 `Sprint`, `Priority` 排序
- Progress View: 顯示 `TaskID`, `Status`, `Size`, `Progress`
- Filter View:
  - `is:open label:P0`
  - `Status:Blocked`

## 4. 卡片模板
```md
## Task
T?.? <task title>

## Scope
- ...

## Acceptance Criteria
- ...

## Definition of Done
- [ ] Code complete
- [ ] Tests pass
- [ ] Docs synced
- [ ] PR opened

## Notes
- Risks:
- Rollback:
```

## 5. 操作規範
- 每個 task 開始時:
  - 建 issue 並掛到看板
  - `Status=In Progress`
  - 同時間只能有 1 張卡在 In Progress（每位 AI agent）
- 每次提交後:
  - 更新 issue checklist
  - 同步 `CHECKPOINT.md`
  - 更新卡片 `Progress`
- 完成時:
  - 合併 PR
  - `Status=Done`
  - `Progress=100`
  - 關閉 issue

## 5.1 整體進度計算 (看板)
- 定義:
  - `Total Points` = 全部卡片 `Size` 加總
  - `Done Points` = `Status=Done` 卡片 `Size` 加總
  - `Overall Progress %` = `Done Points / Total Points * 100`
- 建議:
  - 每週更新一次 `docs/BOARD_PROGRESS.md`
  - 目標是讓你不用進程式碼也能看見專案整體進度

## 6. 最小起始卡片
- T0.1 Monorepo 初始化
- T0.2 CI 基線
- T1.1 PostGIS migration
- T2.1 API v1 skeleton
- T4.1 Web app skeleton

## 7. 與文件同步
- 卡片來源以 `docs/TICKET_BACKLOG.md` 為準。
- 若新增/拆分卡片，需同步更新:
  - `docs/TICKET_BACKLOG.md`
  - GitHub Project board
  - `docs/DEVELOPMENT_PLAN_AI.md`（若任務序列改動）
