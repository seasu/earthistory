# AI Development Prompt (Earthistory)

請在本 repo 依規格執行開發，並遵守以下文件：

1. `PRD.md`
2. `docs/DEVELOPMENT_PLAN.md`
3. `docs/DEVELOPMENT_PLAN_AI.md`
4. `docs/AI_HANDOFF_RUNBOOK.md`
5. `docs/KANBAN_SETUP.md`

## 執行規則
- 依 `docs/DEVELOPMENT_PLAN_AI.md` 的 Task Sequence 從 `T0` 開始。
- 小步提交、單一責任，每完成一個子任務至少一次 commit。
- 任何程式碼變更若影響需求/架構/API/授權，必須同 PR 更新文件。
- 嚴格維持 free-tier 優先，不引入未核准的付費依賴。

## 每次回報格式
- Scope
- Changes
- Verification
- Risks
- Docs Sync
- Next

## 中斷與續跑
- 每次 session 結束前必須更新 `CHECKPOINT.md`（格式依 `docs/AI_HANDOFF_RUNBOOK.md`）。
- 若因額度中斷，下次開始前必須先讀 `CHECKPOINT.md` 後再繼續。

## 看板要求
- 使用 GitHub Projects（Free）維護任務進度。
- 每個任務需對應 `TaskID`（T0~T5）並更新狀態。

## 開始動作
- 先回覆將執行的第一個子任務（例如 `T0.1`）與驗收方式，然後直接開始實作。
