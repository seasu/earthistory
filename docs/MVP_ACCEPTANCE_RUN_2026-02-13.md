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
- [ ] Step 1 Homepage loaded
- [ ] Step 2 Timeline switch works
- [ ] Step 3 Event click shows details
- [ ] Step 4 2D/3D switch works
- [ ] Step 5 Filters apply/clear works

## Non-functional (Manual)
- [ ] Loading baseline acceptable
- [ ] Interaction latency acceptable
- [ ] Error handling visible and recoverable

## Findings
- none (automated pre-check)

## Result
- Overall: PARTIAL (manual verification pending)
- Next action:
  - 完成 checklist 的手動驗收項目後，更新本檔結果為 PASS/FAIL
