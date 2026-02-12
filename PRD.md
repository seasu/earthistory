# Earthistory PRD

## 1. 文件資訊
- 專案名稱: Earthistory
- 版本: v0.2 (Research-aligned Draft)
- 最後更新: 2026-02-12
- 文件維護: Seasu + Codex

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

## 9. 成功指標 (MVP)
- 使用者可在 3 分鐘內完成:
  - 切換年代
  - 找到特定地區事件
  - 開啟事件詳情
- 基本效能:
  - 首次載入時間與互動流暢度達到可用水準（待定量化）
- 留存/互動:
  - 事件點擊率、搜尋使用率、平均探索時長（待定義目標值）

## 10. 技術選型結論 (成本與效率優先)
### 10.1 選型原則
- 優先使用可自訂程度高、可自架、可逐步擴展的開源技術。
- 避免在 MVP 階段綁定高浮動雲端地圖計費。
- 先做「資料與互動體驗驗證」，再投入高擬真 3D 成本。

### 10.2 Google Earth 路線評估
- Google Earth 可匯入 KML/KMZ 與其他地理資料，適合原型展示。
- Google Maps Platform 的 Earth 3D Tiles 與資料層功能屬商業計費範疇，且資料層文件目前示例聚焦美國邊界/地理單元。
- 結論: Google 生態可做參考與輔助，不作為 MVP 核心渲染引擎，避免客製化受限與成本不確定性。

### 10.3 MVP 推薦技術
- 前端 3D 地球: CesiumJS
- 前端框架: React + TypeScript + Vite
- 地圖底圖: OpenStreetMap 向量/影像服務 (初期可先用公開來源，後續改自架 tile)
- 後端 API: Node.js (Fastify/Nest 擇一) + PostgreSQL + PostGIS
- 搜尋: PostgreSQL full-text + trigram (MVP)，後續再評估 OpenSearch/Meilisearch
- 快取/CDN: Cloudflare (靜態資源 + tile 快取)

### 10.4 Google Maps 納入考量 (新增)
- 可行性: Google Maps JavaScript API + Data layer/GeoJSON 可快速做 2D 地圖事件疊圖與點擊互動。
- 優勢:
  - 生態成熟、文件完整、前端整合速度快。
  - 地點搜尋與地理服務能力完整，適合早期快速驗證。
- 限制:
  - 若要「Google Earth 感」3D 全球沉浸體驗，仍需額外評估 3D 能力與產品一致性。
  - 大量流量與高頻呼叫時，商業 API 計費波動需要嚴格監控。
- 建議採用方式:
  - 方案 A (成本優先): MVP 以 Cesium 為主，Google Maps 僅做地理搜尋補強。
  - 方案 B (速度優先): 先用 Google Maps 做 2D MVP，上線驗證後再評估是否轉 Cesium 3D 核心。
  - 方案 C (混合): 提供 2D (Google Maps) + 3D (Cesium) 雙模式，後期再看使用行為收斂。

## 11. 系統架構方向 (MVP)
### 11.1 前端模組
- Globe Viewer: 地球渲染、相機控制、點位與圖層管理
- Timeline Controller: 年代切換、播放/暫停、時間範圍控制
- Event Panel: 事件詳情、來源、關聯事件
- Filter/Search Bar: 關鍵字、主題、地區、時間條件

### 11.2 後端模組
- Event API: 查詢事件、時間區間、地理範圍
- Ingestion Pipeline: 匯入 seed data、正規化、去重、來源追蹤
- Admin Tools (internal): 資料校正與批次上傳

### 11.3 資料模型補充
- 新增欄位:
  - `region_name` (人可讀地區)
  - `precision_level` (year/decade/century)
  - `confidence_score` (資料可信度)
  - `source_name` (來源名稱)

## 12. 成本策略
### 12.1 成本控制原則
- 原則 1: 先固定成本，後可變成本。
- 原則 2: 先限制資料量與圖層數量，確保每次擴張可量化。
- 原則 3: 優先可替換元件，避免早期 vendor lock-in。

### 12.2 MVP 成本分層 (相對級距)
- 低成本方案 (推薦): CesiumJS + OSM + 單一雲主機 + PostGIS
- 中成本方案: 加入商業向量 tile 或地理搜尋服務
- 高成本方案: 大量依賴商業 3D Tiles 與高頻地圖 API 呼叫

### 12.3 階段化投入
- Phase A (0 -> MVP): 僅上線核心功能與小型 seed dataset
- Phase B (MVP -> Beta): 擴資料規模、加入快取與可觀測性
- Phase C (Beta -> Growth): 視使用量導入商業地圖能力

## 13. 參考專案與可重用性
- OpenHistoricalMap (`github.com/OpenHistoricalMap`): 可作為歷史地理資料與社群協作參考。
- historical-basemaps (`github.com/halaszg/historical-basemaps`): 提供歷史底圖資料來源索引，可作內容層參考。
- history-map (`github.com/yorkeccak/history-map`): React + Mapbox + timeline 的互動型歷史地圖實作，可借鏡前端互動設計。

## 14. 里程碑 (更新)
- Milestone 1: PRD 定稿 + wireframe + 技術 PoC (Cesium 地球 + timeline 假資料)
- Milestone 2: 事件 API + PostGIS + 基礎搜尋/篩選
- Milestone 3: MVP 封測 (地球瀏覽 + 年代切換 + 點擊事件詳情)
- Milestone 4: Beta 前優化 (效能、資料品質、觀測指標)

## 15. 風險與假設
- 假設: 初期資料量可控，先追求體驗驗證。
- 風險: 歷史資料正確性與來源一致性不易維持。
- 風險: 大量點位在地圖上可能造成效能瓶頸。
- 風險: 跨時代/跨地區分類標準不一，影響搜尋與比較體驗。

## 16. 開放問題 (下一輪需定案)
- 時間精度預設要到哪個層級（年/十年/世紀）？
- 首發版本預設 3D 地球還是 2D 地圖，或提供切換？
- 初期內容主題是否聚焦 2-3 類（例如文明、戰爭、科技）？
- `source_url` 顯示策略是單一主來源，或多來源並列？

## 17. 維護規則
- 本文件作為專案 PRD 單一真實來源（single source of truth）。
- 每次需求討論後，將更新本檔案並記錄版本與日期。
