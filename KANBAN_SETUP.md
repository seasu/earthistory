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

## 3. 建議欄位視圖
- Board View: 依 `Status` 分欄
- Table View: 依 `Sprint`, `Priority` 排序
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
- 每次提交後:
  - 更新 issue checklist
  - 同步 `CHECKPOINT.md`
- 完成時:
  - 合併 PR
  - `Status=Done`
  - 關閉 issue

## 6. 最小起始卡片
- T0.1 Monorepo 初始化
- T0.2 CI 基線
- T1.1 PostGIS migration
- T2.1 API v1 skeleton
- T4.1 Web app skeleton
