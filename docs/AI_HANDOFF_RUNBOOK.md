# Earthistory AI Handoff Runbook

更新日期: 2026-02-13
用途: 當 AI 額度用完或中斷時，下一次可無縫接續開發。

## 1. 每次開發結束前必做
- 更新文件:
  - `PRD.md`
  - `docs/DEVELOPMENT_PLAN.md`
  - `docs/DEVELOPMENT_PLAN_AI.md`
  - `docs/COLLABORATION_WORKMODE.md`（若本次調整協作規範）
- 更新進度:
  - 在 commit message 註明完成的 task id（例如 `T2.1`, `T2.2`）
  - 在看板移動卡片狀態（Todo -> In Progress -> Done）
  - 填寫 `Owner / Agent / BlockedBy`
- 產出 checkpoint:
  - 建立 `CHECKPOINT.md`（覆蓋更新）
  - 記錄最後完成、進行中、下一步、阻塞事項

## 2. CHECKPOINT.md 格式
```md
# Checkpoint
- Date: YYYY-MM-DD HH:mm (UTC+8)
- Branch: codex/<name>
- Last Commit: <hash>
- Completed:
  - T?.?
- In Progress:
  - T?.?
- Next:
  - T?.?
- Blockers:
  - <none or detail>
- Docs Synced:
  - [x] PRD.md
  - [x] docs/DEVELOPMENT_PLAN.md
  - [x] docs/DEVELOPMENT_PLAN_AI.md
```

## 3. 恢復開發流程 (Resume)
- Step 1: `git pull` 最新分支
- Step 2: 讀 `CHECKPOINT.md`
- Step 3: 讀 `docs/DEVELOPMENT_PLAN_AI.md` 並定位下一個 task
- Step 4: 驗證工作環境與測試基線
- Step 5: 開始下一個最小可交付項，完成後立即更新 checkpoint

## 4. 禁止事項
- 不可在未讀 `CHECKPOINT.md` 前直接開始新任務。
- 不可跨多個 task 大量修改後一次提交。
- 不可只改程式碼不更新文件。
- 多 agent 模式下不可跳過領票流程（詳見 `docs/COLLABORATION_WORKMODE.md`）。

## 5. 驗證指令 (建議)
- `git status --short --branch`
- `pnpm -r lint`
- `pnpm -r typecheck`
- `pnpm -r test`
