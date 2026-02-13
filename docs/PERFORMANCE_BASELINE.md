# Performance Baseline (T6.3)

目標: 建立 MVP 的三項效能基線與門檻，作為後續回歸檢查依據。

## Metrics
- Web 首屏基線: `webFirstScreenP95Ms`
- 互動延遲基線: `interactionP95Ms`
- API 整體基線: `apiP95Ms`

備註:
- 互動延遲目前以 `/events` API 延遲作為 timeline/filter 互動代理指標。

## 門檻定義
- `WEB_FIRST_SCREEN_P95_MS`: 預設 `2500`
- `INTERACTION_P95_MS`: 預設 `800`
- `API_P95_MS`: 預設 `700`

判斷規則:
- `OK`: 實測值 `<= threshold`
- `WARNING`: `threshold < 實測值 <= threshold * 1.2`
- `CRITICAL`: `實測值 > threshold * 1.2`（檢查腳本退出碼 `2`）

## 產生基線
```bash
STAGING_WEB_URL="https://seasu.github.io/earthistory/" \
STAGING_API_URL="https://earthistory-api-staging.onrender.com" \
node infra/ops/generate-performance-baseline.mjs
```

輸出檔案:
- `infra/ops/performance-baseline.json`（已加入 `.gitignore`）

可調整參數:
- `PERF_SAMPLE_COUNT`（預設 12）

## 檢查門檻
```bash
node infra/ops/check-performance-thresholds.mjs --input infra/ops/performance-baseline.json
```

可覆寫門檻:
```bash
WEB_FIRST_SCREEN_P95_MS=2300 \
INTERACTION_P95_MS=700 \
API_P95_MS=650 \
node infra/ops/check-performance-thresholds.mjs --input infra/ops/performance-baseline.json
```

## 建議流程
1. 部署完成後先跑一次 baseline。
2. 版本發佈前重跑一次 baseline 並做 threshold check。
3. 若 `WARNING` 或 `CRITICAL`，先定位 API 或前端瓶頸，再決定是否進行發佈。
