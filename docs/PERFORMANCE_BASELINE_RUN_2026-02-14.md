# Performance Baseline Run (2026-02-14)

- Run time (UTC): 2026-02-13T19:15:16.568Z
- Branch: `codex/t6-2-e2e-critical-flows`
- Command:
  - `STAGING_WEB_URL='https://seasu.github.io/earthistory/' STAGING_API_URL='https://earthistory-api-staging.onrender.com' node infra/ops/generate-performance-baseline.mjs`
  - `node infra/ops/check-performance-thresholds.mjs --input infra/ops/performance-baseline.json`

## Result
- `webFirstScreenP95Ms`: `511.62ms` (threshold `2500ms`) -> `OK`
- `interactionP95Ms`: `188.67ms` (threshold `800ms`) -> `OK`
- `apiP95Ms`: `211.91ms` (threshold `700ms`) -> `OK`

## Conclusion
- 本次 baseline 與門檻檢查均通過。
- 目前無需調高告警等級，延續現行預設門檻即可。
