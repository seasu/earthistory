# Earthistory MVP Manual Acceptance Checklist (T6.1)

更新日期: 2026-02-13  
目的: 用固定流程驗證 MVP 核心體驗，確保可重複執行且可追蹤結果。

## 1. 測試前置條件
- 前端 URL 可存取（staging 或 local）
- API URL 可存取
- 有 seed 資料（至少 10 筆事件）
- 瀏覽器: 最新版 Chrome

## 2. 3 分鐘任務流程（核心驗收）
1. 開啟首頁，確認頁面可正常載入
- 預期: 地圖區塊、時間軸、篩選器、事件面板皆可見

2. 切換年代（至少 2 次）
- 操作: 將時間軸切換到不同年代
- 預期: 事件點位與事件列表會更新

3. 在地圖上選一個事件
- 操作: 點擊事件點位
- 預期: 事件詳情面板顯示標題、時間、摘要、來源資訊

4. 切換地圖模式（3D/2D）
- 操作: 3D -> 2D -> 3D
- 預期: 地圖可切換且不丟失當前查詢條件

5. 使用篩選器
- 操作: 套用分類或關鍵字，再清除篩選
- 預期: 清單與點位同步更新，清除後回復預設狀態

## 3. 非功能基本檢核
- 載入: 首次開頁無白屏超過 3 秒
- 互動: 點擊事件後 1 秒內有可見回應（面板或 loading）
- 錯誤處理: API 失敗時顯示錯誤訊息，不可整頁壞掉

## 4. 結果紀錄模板
```md
# MVP Acceptance Run
- Date: YYYY-MM-DD HH:mm (UTC+8)
- Tester: <name>
- Web URL: <url>
- API URL: <url>
- Data Snapshot: <seed version/commit>

## Core Flow
- [ ] Step 1 Homepage loaded
- [ ] Step 2 Timeline switch works
- [ ] Step 3 Event click shows details
- [ ] Step 4 2D/3D switch works
- [ ] Step 5 Filters apply/clear works

## Non-functional
- [ ] Loading baseline acceptable
- [ ] Interaction latency acceptable
- [ ] Error handling visible and recoverable

## Findings
- Issue:
  - Severity: P0/P1/P2
  - Repro steps:
  - Expected:
  - Actual:

## Result
- Overall: PASS / FAIL
- Next action:
```

## 5. 驗收判定規則
- PASS:
  - 核心流程 5 項全部通過
  - 無 P0 問題
- FAIL:
  - 任一核心流程失敗，或出現 P0 問題

## 6. T6.1 完成定義
- 已有本檢核文件（本檔）
- 至少完成 1 次實測紀錄（可放 `docs/MVP_ACCEPTANCE_RUN_*.md`）
- 相關問題已建立 ticket 或列入下一張票
- 完成後需與產品 owner 重新討論下一階段重點（Phase 6B+）
