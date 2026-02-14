# Plan: Fix Map Pins + Add i18n (zh-TW / en)

## Problem 1: Map pins not showing data
The map pins code in `MapLibreProvider.tsx` looks correct — markers are created from `events` array with lat/lng. The default year is 1450, window ±50 = 1400–1500, which should match events like Printing Press (1450), Fall of Constantinople (1453), Inca Empire (1438), etc. The most likely issue is that the API server isn't running or the `VITE_API_BASE_URL` isn't configured correctly, causing fetch failures. However, I'll also add a console warning for empty events to make debugging easier.

## Problem 2: i18n — Traditional Chinese + English

### Approach
- Use lightweight custom i18n (no library dependency) since there are only ~25 UI strings
- Create a `useLocale` React context with `locale` state and `t()` translation function
- Store locale in `localStorage` for persistence
- Detect browser language for initial default

### File changes

#### 1. `apps/web/src/i18n.ts` (NEW)
- Define `Locale = "en" | "zh-TW"`
- UI string translations dictionary for both locales
- Category translations: `civilization → 文明`, `war → 戰爭`, `technology → 科技`, etc.
- Region translations: `Mesopotamia → 美索不達米亞`, `Egypt → 埃及`, etc.
- `formatYear()` localized: `BCE → 西元前`, `CE → 西元`
- `LocaleContext` React context + `LocaleProvider` + `useLocale` hook

#### 2. `apps/api/src/data/mock.ts` (MODIFY)
- Add `title_zh` and `summary_zh` fields to `EventRecord` type
- Add Traditional Chinese translations for all 85 events' title and summary
- Add `regionName_zh` field for region name translations

#### 3. `apps/api/src/plugins/query.ts` (MODIFY)
- Accept `?locale=en|zh-TW` query parameter
- When locale is `zh-TW`, return `title_zh` as `title`, `summary_zh` as `summary`, `regionName_zh` as `regionName`
- For `/regions` endpoint, also respect locale

#### 4. `apps/web/src/App.tsx` (MODIFY)
- Wrap with `LocaleProvider`
- Replace all hardcoded strings with `t("key")` calls
- Use localized `formatYear`
- Add language switcher button (floating, top-left or near mode switch)
- Pass `locale` to API calls as query param

#### 5. `apps/web/src/main.tsx` (MODIFY)
- Wrap `<App />` with `<LocaleProvider>`

#### 6. `apps/web/tests/e2e/critical-flows.spec.ts` (MODIFY)
- Update mock data to include `title_zh`, `summary_zh`, `regionName_zh` fields
- Update test selectors if needed (tests run in English locale by default)

### UI strings to translate (en → zh-TW)
| Key | English | 繁體中文 |
|-----|---------|---------|
| events | Events | 事件 |
| eventsInView | {count} events in view | 顯示 {count} 個事件 |
| loading | Loading... | 載入中... |
| retry | Retry | 重試 |
| noEvents | No events in this time window. | 此時間範圍內無事件 |
| filters | Filters | 篩選 |
| category | Category | 分類 |
| region | Region | 地區 |
| keyword | Keyword | 關鍵字 |
| allCategories | All categories | 所有分類 |
| allRegions | All regions | 所有地區 |
| searchPlaceholder | Search... | 搜尋... |
| regionLabel | Region: | 地區： |
| timeLabel | Time: | 時間： |
| precisionLabel | Precision: | 精確度： |
| confidenceLabel | Confidence: | 信心度： |
| source | Source | 來源 |
| collapse | Collapse event panel | 收合事件面板 |
| expand | Expand event panel | 展開事件面板 |
| close | Close event panel | 關閉事件面板 |
| bce | {n} BCE | 西元前 {n} 年 |
| ce | {n} CE | 西元 {n} 年 |
| windowHint | ±50 years | ±50 年 |
| year | year | 年 |
| decade | decade | 十年 |
| century | century | 世紀 |
| eventError | Event load error: | 事件載入錯誤： |
| regionError | Region error: | 地區錯誤： |
