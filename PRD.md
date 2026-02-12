# Earthistory PRD

## 1. 文件資訊
- 專案名稱: Earthistory
- 版本: v0.7 (Market Demand Validation Added)
- 最後更新: 2026-02-12
- 文件維護: Seasu + Codex
- 開發工具註記: `Codex GPT-5.3-Codex Medium`

## 2. 產品願景
建立一個「類 Google Earth」的互動式地球介面，讓使用者用時間軸探索地球與人類歷史事件，並能以地理位置為核心理解歷史脈絡。

## 3. 問題定義
- 歷史學習常以文字與年代呈現，缺少空間感與地理脈絡。
- 現有地圖工具不以歷史敘事為主要體驗。
- 使用者難以在同一介面中同時理解 `時間 + 地點 + 事件` 的關係。

## 4. 目標與非目標
### 4.1 目標
- 提供可縮放、可旋轉的地球/地圖視圖，作為歷史探索主介面。
- 提供時間軸控制，讓使用者可切換時代並查看事件。
- 讓使用者點選地圖上的事件，查看摘要、時間、來源與關聯資訊。

### 4.2 非目標 (目前)
- 不先做完整學術資料庫或專家審稿流程。
- 不先做多人協作編輯後台。
- 不先做高度擬真的 3D 地形模擬。

## 5. 目標使用者
- 對歷史與地理有興趣的一般使用者
- 學生與教育工作者
- 需要快速建立時空脈絡的內容創作者

## 6. 核心使用情境
- 使用者滑動時間軸到特定年代，查看該時期全球重要事件分布。
- 使用者搜尋地點（如文明發源地），查看不同時代在該地點發生的事件。
- 使用者依主題（戰爭、文明、科技、災害）篩選地圖事件。

## 7. 功能需求 (初稿)
### 7.1 Must-have
- 互動地圖/地球視圖（平移、縮放、旋轉）
- 時間軸瀏覽（至少支援年代級別切換）
- 事件點位渲染與點擊詳情
- 關鍵字搜尋（地點/事件）
- 基本篩選（時間區間、主題）

### 7.2 Should-have
- 事件之間的關聯連結（例如前因後果）
- 收藏/書籤
- 中英雙語內容基礎支援

### 7.3 Could-have
- 導覽模式（故事路徑）
- 測驗模式（教育用途）
- 自訂圖層（文明、遷徙、板塊、氣候）

## 8. 內容與資料需求
- 事件資料模型至少包含:
  - `id`
  - `title`
  - `time_start`, `time_end` (可空)
  - `location` (lat/lng 或 geometry)
  - `category`
  - `summary`
  - `source_url`
- 初期資料來源策略:
  - 先以少量高品質 seed dataset 驗證體驗
  - 後續擴展來源與資料清洗流程

### 8.1 法務與授權策略 (新增)
- 本專案以「可再散布、可商用、可標示來源」資料為優先。
- 不直接抓取無明確授權的網站內容（即使可瀏覽，也不代表可再利用）。
- 每筆事件都必須保留 `source_name`, `source_url`, `license`, `attribution_text`, `retrieved_at`。
- 上線前執行 License Audit，未通過的資料不進 production。
- 正式決策: 採用 `嚴格開放授權-only` 政策，作為長期維護預設。
- 核心事件資料白名單: `CC0`, `CC BY 4.0` (或等價相容授權)。
- 地理圖層規則: `ODbL` 可使用，但必須與核心事件資料分層/分庫管理，避免授權義務混淆。
- 禁止進 production: `CC BY-SA`、授權不明、或 ToS 限制再散布之來源（除非未來另開隔離資料產品線）。

### 8.2 可優先導入的資料來源 (授權相容)
- Wikidata (CC0): 適合事件結構化欄位與實體連結。
- Wikimedia API/內容生態 (CC BY-SA 為主): 可用於摘要與補充，但需落實署名與相同方式分享義務。
- OpenStreetMap (ODbL): 適合地理底圖與地理物件，需遵循 ODbL 與署名規則。
- World Historical Gazetteer (資料聚合型歷史地名): 適合歷史地名對照與地理參照。
- GeoNames (CC BY 4.0): 適合地名標準化與地理編碼補強。

### 8.3 暫不建議直接匯入的來源
- 未標示授權條款或授權不明確的網站內容。
- 僅允許個人/教育瀏覽、不允許再散布的資料庫。
- ToS 明確禁止抓取、重製或衍生使用的服務內容。

## 9. 成功指標 (MVP)
- 使用者可在 3 分鐘內完成:
  - 切換年代
  - 找到特定地區事件
  - 開啟事件詳情
- 基本效能:
  - 首次載入時間與互動流暢度達到可用水準（待定量化）
- 留存/互動:
  - 事件點擊率、搜尋使用率、平均探索時長（待定義目標值）

## 10. 技術選型結論 (已定案)
### 10.1 選型原則
- 優先使用可自訂程度高、可自架、可逐步擴展的開源技術。
- 避免在 MVP 階段綁定高浮動雲端地圖計費。
- 先做「資料與互動體驗驗證」，再投入高擬真 3D 成本。
- 採「模組化單體」優先，先穩定資料模型與 API 邊界，再視流量拆分服務。

### 10.2 Google Earth 路線評估
- Google Earth 可匯入 KML/KMZ 與其他地理資料，適合原型展示。
- Google Maps Platform 的 Earth 3D Tiles 與資料層功能屬商業計費範疇，且資料層文件目前示例聚焦美國邊界/地理單元。
- 結論: Google 生態可做參考與輔助，不作為 MVP 核心渲染引擎，避免客製化受限與成本不確定性。

### 10.3 MVP 定版技術
- 前端: React + TypeScript + Vite
- 地球引擎: CesiumJS (預設 3D)
- 2D 模式: MapLibre GL (以同一份 GeoJSON/Vector schema 共用資料)
- UI 元件: shadcn/ui + Tailwind CSS
- 狀態管理: Zustand + TanStack Query
- 後端: Node.js + Fastify + TypeScript (modular monolith)
- API 介面: REST (OpenAPI 規格先行)
- 資料庫: PostgreSQL + PostGIS
- ORM/SQL: Drizzle ORM (以 SQL-first 管理 migration)
- 搜尋: PostgreSQL full-text + trigram
- 背景工作: BullMQ + Redis (資料匯入、重建索引、快取預熱)
- 部署: Docker + single VM (MVP)，Cloudflare 作 CDN/快取
- 觀測: OpenTelemetry + Grafana/Loki (Phase B 導入完整 dashboard)

### 10.4 Google Maps 納入考量 (新增)
- 可行性: Google Maps JavaScript API + Data layer/GeoJSON 可快速做 2D 地圖事件疊圖與點擊互動。
- 優勢:
  - 生態成熟、文件完整、前端整合速度快。
  - 地點搜尋與地理服務能力完整，適合早期快速驗證。
- 限制:
  - 若要「Google Earth 感」3D 全球沉浸體驗，仍需額外評估 3D 能力與產品一致性。
  - 大量流量與高頻呼叫時，商業 API 計費波動需要嚴格監控。
- 建議採用方式:
  - 定案: MVP 不使用 Google Maps 當主地圖引擎。
  - 保留: 僅在「地點搜尋品質不足」時，評估導入 Places API 作輔助服務。
  - 原則: 任何 Google API 依賴都需可替換，禁止耦合到核心事件資料模型。

## 11. 系統架構方向 (MVP 定版)
### 11.1 前端模組
- Globe Viewer: 地球渲染、相機控制、點位與圖層管理
- Timeline Controller: 年代切換、播放/暫停、時間範圍控制
- Event Panel: 事件詳情、來源、關聯事件
- Filter/Search Bar: 關鍵字、主題、地區、時間條件
- Map Mode Switch: 3D (Cesium) / 2D (MapLibre) 共用同一份資料契約

### 11.2 後端模組
- Event API: 查詢事件、時間區間、地理範圍
- Ingestion Pipeline: 匯入 seed data、正規化、去重、來源追蹤
- Admin Tools (internal): 資料校正與批次上傳
- Search Service: 事件全文檢索 + 地名模糊比對
- Auth (internal first): 僅管理後台需要登入，前台匿名可讀

### 11.3 資料模型補充
- 新增欄位:
  - `region_name` (人可讀地區)
  - `precision_level` (year/decade/century)
  - `confidence_score` (資料可信度)
  - `source_name` (來源名稱)

### 11.4 不重構擴展策略 (重要)
- API 穩定化: 先固定 `v1` API schema，新增欄位只做向後相容擴充。
- 儲存分層: `events` (核心事件) 與 `geo_layers` (地理圖層) 分離，避免授權與查詢耦合。
- 模組邊界: `ingestion`, `query`, `search`, `admin` 以獨立模組實作，之後可拆服務不改介面。
- 前端可替換: 地圖渲染層與業務層分離，切換地圖供應商不影響 timeline/filter/event panel。

### 11.5 部署拓樸 (免費雲端優先)
- Web/Edge:
  - 首選: Cloudflare Pages + Workers (前端靜態免費，API 走 Workers 免費額度)
- Database:
  - 首選: Supabase Free 或 Neon Free (PostgreSQL)
  - 規則: schema 與 migration 不綁平台，避免未來搬遷重寫
- Cache/Queue:
  - MVP 先用應用層快取 + DB materialized view
  - 背景工作在免費額度內以 cron + 批次 job 取代常駐 worker
- Storage:
  - 靜態資料與匯入檔優先放 Git LFS 或 Cloudflare R2 free tier
- CI/CD:
  - GitHub Actions（公開 repo 可免費；私有 repo 採配額控管）

## 12. 成本策略 (免費資源優先定案)
### 12.1 成本控制原則
- 原則 1: 先固定成本，後可變成本。
- 原則 2: 先限制資料量與圖層數量，確保每次擴張可量化。
- 原則 3: 優先可替換元件，避免早期 vendor lock-in。
- 原則 4: 月成本預設目標為 `$0`，僅在超額風險可量化時才升級付費。

### 12.2 免費雲端組合 (定版)
- 組合 A (首選, 全免費優先):
  - Frontend/API: Cloudflare Pages + Workers Free
  - DB: Supabase Free (2 projects) 或 Neon Free
  - Storage/CDN: Cloudflare (靜態免費), R2 free tier
  - 適用: MVP、封測、低到中流量驗證
- 組合 B (備援, 仍以免費為主):
  - Frontend: Vercel Hobby 或 Cloudflare Pages
  - API: Cloudflare Workers Free
  - DB: Neon Free
  - 適用: 若某平台額度或功能限制影響交付速度

### 12.3 免費額度防爆策略
- API 防爆:
  - 啟用 response cache、ETag、ISR/靜態化熱門查詢
  - 時間軸查詢採分片與預聚合，降低每次互動查詢量
- DB 防爆:
  - 熱門時段資料做 materialized view
  - 寫入流程批次化，避免高頻小寫入
- 流量防爆:
  - 圖層資料按 zoom/time chunk lazy-load
  - 超出閾值時自動降級為「摘要模式」（減少即時查詢）
- 成本閾值機制:
  - 每週檢查平台 usage dashboard
  - 任一服務達 70% 免費額度即觸發優化任務
  - 達 90% 進入凍結新功能，先做成本優化

### 12.4 階段化投入
- Phase A (0 -> MVP): 僅上線核心功能與小型 seed dataset，目標 `$0/月`
- Phase B (MVP -> Beta): 擴資料規模、加入快取與可觀測性，仍以 free tier 為主
- Phase C (Beta -> Growth): 只有當核心指標達標且免費額度長期不足，才逐項升級付費元件

## 13. 開源專案與資料重用評估 (新增)
### 13.1 可重用優先清單
- OpenHistoricalMap (`github.com/OpenHistoricalMap`)
  - 可借鏡: 歷史 OSM 協作模型、歷史要素標註方式。
  - 注意: ODbL 相容性與 attribution 展示策略需先定義。
- historical-basemaps (`github.com/halaszg/historical-basemaps`)
  - 可借鏡: 歷史底圖來源索引與圖層管理思路。
  - 注意: 各子來源授權不同，不可視為單一授權資料包。
- history-map (`github.com/yorkeccak/history-map`)
  - 可借鏡: 前端 timeline + map 互動 UX。
  - 注意: 先確認該 repo 的授權條款與第三方資料來源授權。
- World Historical Gazetteer (`github.com/whgazetteer`)
  - 可借鏡: 歷史地名對齊、時間屬性與地理關聯資料模型。

### 13.2 授權風險標準
- 若 GitHub repo 無 `LICENSE` 檔，預設不納入程式碼重用（僅作設計參考）。
- 若資料授權要求 share-alike（如 CC BY-SA/ODbL），需評估是否會影響專案資料散布方式。
- 若使用 Google Maps Platform 資料，需遵守 Google Maps Platform Terms，特別是內容使用限制與歸屬要求。

## 14. 資料治理流程 (新增)
- Step 1: Source Intake
  - 登記來源網址、授權型態、ToS 限制、更新頻率。
- Step 2: License Review
  - 分類為 `ALLOW`, `ALLOW_WITH_ATTRIBUTION`, `REJECT`, `REVIEW_WITH_COUNSEL`。
- Step 3: Normalization
  - 將來源資料映射至統一 schema，保留 provenance 欄位。
- Step 4: QA & Legal Gate
  - 抽樣核對事件真實性、版權標示、授權相容性。
- Step 5: Publish
  - 僅發布通過法務 gate 的資料批次。

## 15. 里程碑 (更新)
- Milestone 1: PRD 定稿 + schema 定案 + 技術 PoC (Cesium + timeline 假資料)
- Milestone 2: Fastify API + PostGIS + 資料匯入管線 v1
- Milestone 3: 前端 3D/2D 共用資料契約 + 搜尋/篩選整合
- Milestone 4: MVP 封測 (地球瀏覽 + 年代切換 + 點擊事件詳情)
- Milestone 5: Beta 前優化 (效能、資料品質、觀測指標)

## 16. 風險與假設
- 假設: 初期資料量可控，先追求體驗驗證。
- 風險: 歷史資料正確性與來源一致性不易維持。
- 風險: 大量點位在地圖上可能造成效能瓶頸。
- 風險: 跨時代/跨地區分類標準不一，影響搜尋與比較體驗。
- 風險: 不同資料來源授權混用，可能導致再散布義務衝突。
- 風險: 雲端平台免費方案與額度可能調整，需有替代部署路徑。

## 17. 開放問題 (下一輪需定案)
- 時間精度預設要到哪個層級（年/十年/世紀）？
- 初期內容主題是否聚焦 2-3 類（例如文明、戰爭、科技）？
- `source_url` 顯示策略是單一主來源，或多來源並列？

## 18. 維護規則
- 本文件作為專案 PRD 單一真實來源（single source of truth）。
- 每次需求討論後，將更新本檔案並記錄版本與日期。
- 文件同步規範:
  - 任何程式碼變更若影響需求/架構/API/資料授權，必須同一個 PR 同步更新文件。
  - `PRD.md`, `DEVELOPMENT_PLAN.md`, `DEVELOPMENT_PLAN_AI.md` 三份文件需保持一致。
  - 若實作與 PRD 不一致，先更新 PRD 再合併程式碼。

## 19. 研究依據連結
- Wikidata license (CC0): https://www.wikidata.org/wiki/Wikidata:Licensing
- Wikipedia/Wikimedia API terms: https://api.wikimedia.org/wiki/Terms_and_conditions
- OpenStreetMap copyright and license (ODbL): https://www.openstreetmap.org/copyright
- GeoNames license (CC BY 4.0): https://www.geonames.org/about.html
- World Historical Gazetteer: https://whgazetteer.org/
- Google Maps Platform Terms: https://cloud.google.com/maps-platform/terms
- Google Maps Service Terms (content restrictions): https://cloud.google.com/maps-platform/terms/maps-service-terms/index-20191121
- US Copyright Office (facts are not protected by copyright): https://www.copyright.gov/circs/circ33.pdf
- GitHub no-license guidance: https://choosealicense.com/no-permission/

## 20. 市場需求驗證
- 市場調查已獨立維護於 `docs/MARKET_RESEARCH.md`。
- PRD 僅保留結論:
  - 此產品有需求，但屬於中等規模、分眾明確的教育/知識工具市場。
  - 策略採 `B2C 免費探索 + 教師/課堂導向`，以留存與課堂採用率驗證。

## 21. 開發計畫索引
- 人類可讀版請參考 `docs/DEVELOPMENT_PLAN.md`。
- AI 執行版請參考 `docs/DEVELOPMENT_PLAN_AI.md`。
- AI 中斷續跑規範請參考 `docs/AI_HANDOFF_RUNBOOK.md`。
- 免費看板設定請參考 `docs/KANBAN_SETUP.md`。
- 票務清單請參考 `docs/TICKET_BACKLOG.md`。
- 看板整體進度請參考 `docs/BOARD_PROGRESS.md`。
- 本次對話與決策紀錄請參考 `docs/PROJECT_DISCOVERY_LOG.md`。
- 新專案可重用樣板請參考 `docs/PROJECT_KICKOFF_TEMPLATE.md`。
- AI 開發提示詞請參考 `docs/AI_DEV_PROMPT.md`。
