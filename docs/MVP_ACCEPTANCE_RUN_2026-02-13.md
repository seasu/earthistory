# MVP Acceptance Run
- Date: 2026-02-13 23:48 (UTC+8)
- Tester: Codex
- Web URL: https://seasu.github.io/earthistory/
- API URL: https://earthistory-api-staging.onrender.com
- Data Snapshot: main@4ef28d4

## Automated Pre-check
- Command:
  - `STAGING_WEB_URL='https://seasu.github.io/earthistory/' STAGING_API_URL='https://earthistory-api-staging.onrender.com' node infra/ops/staging-smoke.mjs`
- Result:
  - PASS (`web root`, `/health`, `/events`, `/regions`, `/openapi.json`)

## Core Flow (Manual)
- [x] Step 1 Homepage loaded
- [x] Step 2 Timeline switch works
- [x] Step 3 Event click shows details
- [x] Step 4 2D/3D switch works
- [x] Step 5 Filters apply/clear works

## Non-functional (Manual)
- [x] Loading baseline acceptable
- [x] Interaction latency acceptable
- [x] Error handling visible and recoverable

## Findings
- none

## Result
- Overall: PASS
- Next action:
  - 進入 T6.2（關鍵使用流程 E2E 測試）
