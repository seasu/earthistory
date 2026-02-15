# Wikipedia API 整合研究報告

**專案**: Earthistory
**日期**: 2026-02-15
**目的**: 研究如何最佳化使用 Wikipedia/Wikimedia 資料來源

---

## 1. 專案現況分析

### 1.1 已實作功能
你的專案目前已經有以下 Wikipedia/Wikidata 整合:

#### 現有服務 (`apps/api/src/services/wikidata.service.ts`)
1. **Wikidata 主題搜尋** - `searchTopic()`
   - 使用 Wikidata Search API (`wbsearchentities`)
   - 將自然語言查詢轉換為 QID (Wikidata ID)
   - 例如: "Chinese Culture" → Q1190554

2. **SPARQL 事件查詢** - `fetchRelatedEvents()`
   - 使用 Wikidata SPARQL 端點
   - 查詢策略包含多種關係:
     - `P31/P279*`: instance of / subclass of
     - `P921`: main subject
     - `P361`: part of
     - `P17`: country
     - `P276`: location
   - 必須有座標 (`P625`) 和日期 (`P585`)
   - 回傳: 標題、描述、座標、日期、圖片、Wikipedia 連結

3. **Wikipedia 分類瀏覽** - `fetchCategoryMembers()` & `fetchPageCategories()`
   - 使用 Wikipedia Action API
   - 可取得子分類和父分類
   - 用於提供主題建議

#### 資料模型支援
Database schema (`infra/db/migrations/`) 已支援:
- ✅ `title`, `summary`, `category`
- ✅ `location` (PostGIS Point)
- ✅ `time_start`, `time_end`
- ✅ `source_url`, `wikipedia_url`, `image_url`
- ✅ 多語言支援 (`title_zh`, `summary_zh`, `region_name_zh`)
- ✅ `image_attribution` (符合 CC BY-SA 要求)

---

## 2. Wikipedia/Wikimedia API 生態系統

### 2.1 可用的 API 選項

#### A. Wikidata Query Service (SPARQL) ⭐ 已使用
- **端點**: `https://query.wikidata.org/sparql`
- **授權**: CC0 (公共領域)
- **優點**:
  - 結構化資料，品質高
  - 支援複雜關係查詢
  - 有地理座標和時間屬性
  - 完全符合專案授權政策 (CC0)
- **限制**:
  - 查詢複雜度有限制
  - 摘要文字較短 (description)
  - Rate limit: 建議不超過 5 queries/second
- **適用場景**: ✅ 取得事件基本資料、座標、時間

#### B. Wikipedia Action API ⭐ 已使用
- **端點**: `https://en.wikipedia.org/w/api.php`
- **授權**: CC BY-SA 3.0/4.0 (需署名、相同方式分享)
- **已使用功能**:
  - `action=query&list=categorymembers` - 取得分類成員
  - `action=query&prop=categories` - 取得頁面分類
- **可擴充功能**:
  - `prop=extracts` - 取得文章摘要 (純文字/HTML)
  - `prop=pageimages` - 取得頁面代表圖片
  - `prop=coordinates` - 取得地理座標
  - `prop=revisions` - 取得完整內容
  - `action=opensearch` - 快速搜尋建議
- **適用場景**: ✅ 豐富事件描述、取得更好的摘要文字

#### C. Wikipedia REST API v1 ⭐ 推薦新增
- **端點**: `https://en.wikipedia.org/api/rest_v1/`
- **授權**: CC BY-SA 3.0/4.0
- **關鍵端點**:
  - `/page/summary/{title}` - 取得文章摘要 (包含圖片、座標)
  - `/page/html/{title}` - 取得乾淨的 HTML
  - `/page/mobile-sections/{title}` - 移動版內容 (結構化)
- **優點**:
  - 效能更好 (有 CDN cache)
  - 回應格式標準化 (JSON)
  - 包含圖片 thumbnail URL
  - 有 RESTful 設計
- **適用場景**: ✅✅ 取得文章摘要和圖片 (建議優先使用)

#### D. Wikimedia Commons API
- **端點**: `https://commons.wikimedia.org/w/api.php`
- **授權**: 各圖片授權不同 (需個別檢查)
- **功能**:
  - `prop=imageinfo` - 取得圖片授權、作者、描述
  - 可取得高解析度圖片 URL
- **適用場景**: ✅ 驗證圖片授權、取得 attribution 文字

#### E. Wikimedia EventStreams ⚡ 進階選項
- **端點**: `https://stream.wikimedia.org/v2/stream/`
- **授權**: CC0/CC BY-SA (依內容類型)
- **功能**:
  - 即時接收 Wikipedia 編輯事件
  - Server-Sent Events (SSE)
- **適用場景**: ⏰ 未來考慮 - 自動更新事件資料

---

## 3. 授權合規分析

### 3.1 授權相容性矩陣

| 資料來源 | 授權 | 專案政策 | 是否可用 | 要求 |
|---------|------|---------|---------|------|
| Wikidata (結構化資料) | CC0 | ✅ 白名單 | ✅ 可用 | 無 (公共領域) |
| Wikipedia (文章內容) | CC BY-SA 3.0/4.0 | ⚠️ 需評估 | ✅ 可用 | 必須署名 + Share-Alike |
| Wikimedia Commons 圖片 | 各異 (CC0/BY/BY-SA) | ⚠️ 需個別驗證 | ⚠️ 部分可用 | 依圖片授權決定 |

### 3.2 專案授權策略建議

根據 PRD.md (8.1 節)，專案採用「嚴格開放授權-only」政策:
- ✅ **核心事件資料白名單**: CC0, CC BY 4.0
- ⚠️ **Wikipedia 內容 (CC BY-SA)** 的處理方式:

**方案 A: 分層儲存 (推薦)** ⭐
```
核心事件表 (events)         → 僅存 Wikidata CC0 資料
擴充內容表 (event_content) → 存 Wikipedia CC BY-SA 摘要
```
- 優點: 授權清晰分離，符合 PRD 8.1 規範
- 缺點: 需要額外資料表

**方案 B: 欄位標記**
```sql
ALTER TABLE events ADD COLUMN content_license TEXT;
ALTER TABLE events ADD COLUMN content_attribution TEXT;
```
- 優點: 結構簡單
- 缺點: 混合授權在同一表，可能造成散布義務混淆

**建議**: 採用**方案 A**，並在 migration 中新增:
```sql
-- 0009_wikipedia_content_layer.sql
CREATE TABLE event_content (
  event_id BIGINT PRIMARY KEY REFERENCES events(id) ON DELETE CASCADE,
  full_summary TEXT,
  html_content TEXT,
  license TEXT NOT NULL DEFAULT 'CC BY-SA 4.0',
  attribution TEXT NOT NULL,
  source_url TEXT NOT NULL,
  retrieved_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 4. 實作建議與改進方案

### 4.1 新增 Wikipedia REST API 整合

#### 建議新增 Service: `wikipedia.service.ts`

```typescript
// apps/api/src/services/wikipedia.service.ts

export class WikipediaService {
  private static readonly USER_AGENT = "Earthistory/1.0 (seasu@example.com)";
  private static readonly REST_API_BASE = "https://en.wikipedia.org/api/rest_v1";

  /**
   * 取得文章摘要 (包含圖片、座標、摘要文字)
   * License: CC BY-SA 4.0
   */
  static async getPageSummary(title: string, lang: string = "en"): Promise<{
    title: string;
    extract: string;        // 純文字摘要 (2-3 句)
    extractHtml: string;    // HTML 摘要
    thumbnail?: {
      source: string;
      width: number;
      height: number;
    };
    coordinates?: {
      lat: number;
      lon: number;
    };
    contentUrl: string;     // Wikipedia 文章 URL
    license: string;
    attribution: string;
  } | null> {
    const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": this.USER_AGENT,
          "Accept": "application/json"
        }
      });

      if (!response.ok) return null;

      const data = await response.json();

      return {
        title: data.title,
        extract: data.extract,
        extractHtml: data.extract_html,
        thumbnail: data.thumbnail,
        coordinates: data.coordinates,
        contentUrl: data.content_urls.desktop.page,
        license: "CC BY-SA 4.0",
        attribution: `From Wikipedia: ${data.content_urls.desktop.page}`
      };
    } catch (error) {
      console.error(`Wikipedia REST API error for ${title}:`, error);
      return null;
    }
  }

  /**
   * 批次取得多個文章摘要 (with rate limiting)
   */
  static async getPageSummariesBatch(
    titles: string[],
    lang: string = "en",
    delayMs: number = 200
  ): Promise<Map<string, any>> {
    const results = new Map();

    for (const title of titles) {
      const summary = await this.getPageSummary(title, lang);
      if (summary) {
        results.set(title, summary);
      }
      // Rate limiting: 200ms delay = max 5 req/sec
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }

    return results;
  }
}
```

### 4.2 改進現有 Wikidata Service

#### 建議改進項目:

1. **新增 Rate Limiting**
```typescript
// Simple in-memory rate limiter
class RateLimiter {
  private requests: number[] = [];
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  async waitIfNeeded() {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);

    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.windowMs - (now - oldestRequest);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.requests.push(Date.now());
  }
}

// Usage in WikidataService
private static rateLimiter = new RateLimiter(5, 1000); // 5 req/sec

static async fetchRelatedEvents(qid: string, limit = 500) {
  await this.rateLimiter.waitIfNeeded();
  // ... existing code
}
```

2. **新增 Retry Logic**
```typescript
static async fetchWithRetry(
  url: string,
  maxRetries: number = 3,
  backoffMs: number = 1000
): Promise<Response> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": this.USER_AGENT }
      });

      if (response.ok) return response;

      // Retry on 429 (rate limit) or 5xx errors
      if (response.status === 429 || response.status >= 500) {
        await new Promise(resolve =>
          setTimeout(resolve, backoffMs * Math.pow(2, i))
        );
        continue;
      }

      return response;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve =>
        setTimeout(resolve, backoffMs * Math.pow(2, i))
      );
    }
  }
  throw new Error("Max retries exceeded");
}
```

3. **改進 License 追蹤**
```typescript
type WikidataEvent = {
  // ... existing fields
  license: "CC0";  // Wikidata 資料固定為 CC0
  dataSource: "wikidata";
  wikidataQid: string;  // 保留 QID 供追溯
};
```

### 4.3 建議新增端點

#### A. 豐富事件內容端點
```typescript
// apps/api/src/plugins/ingestion.ts

app.post("/enrich-event/:eventId", async (request, reply) => {
  const { eventId } = request.params;
  const pool = getPool();

  // 1. 從 DB 取得事件 (包含 wikipedia_url)
  const event = await pool.query(
    "SELECT * FROM events WHERE id = $1",
    [eventId]
  );

  if (!event.rows[0]?.wikipedia_url) {
    return reply.code(404).send({ error: "No Wikipedia URL" });
  }

  // 2. 從 Wikipedia URL 提取標題
  const title = event.rows[0].wikipedia_url.split("/wiki/")[1];

  // 3. 取得 Wikipedia 摘要
  const summary = await WikipediaService.getPageSummary(
    decodeURIComponent(title)
  );

  if (!summary) {
    return reply.code(404).send({ error: "Wikipedia page not found" });
  }

  // 4. 儲存到 event_content 表
  await pool.query(`
    INSERT INTO event_content (
      event_id, full_summary, html_content, license,
      attribution, source_url, retrieved_at
    ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
    ON CONFLICT (event_id) DO UPDATE SET
      full_summary = EXCLUDED.full_summary,
      html_content = EXCLUDED.html_content,
      retrieved_at = NOW()
  `, [
    eventId,
    summary.extract,
    summary.extractHtml,
    summary.license,
    summary.attribution,
    summary.contentUrl
  ]);

  return { message: "Event enriched successfully", summary };
});
```

#### B. 批次豐富化工作
```typescript
// apps/api/src/plugins/admin.ts

app.post("/batch-enrich", async (request, reply) => {
  const pool = getPool();

  // 取得所有有 wikipedia_url 但沒有豐富內容的事件
  const events = await pool.query(`
    SELECT e.id, e.wikipedia_url
    FROM events e
    LEFT JOIN event_content ec ON e.id = ec.event_id
    WHERE e.wikipedia_url IS NOT NULL
      AND ec.event_id IS NULL
    LIMIT 100
  `);

  let enriched = 0;

  for (const event of events.rows) {
    const title = event.wikipedia_url.split("/wiki/")[1];
    const summary = await WikipediaService.getPageSummary(
      decodeURIComponent(title)
    );

    if (summary) {
      await pool.query(`
        INSERT INTO event_content (
          event_id, full_summary, html_content, license,
          attribution, source_url, retrieved_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      `, [
        event.id,
        summary.extract,
        summary.extractHtml,
        summary.license,
        summary.attribution,
        summary.contentUrl
      ]);
      enriched++;
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  return {
    message: `Enriched ${enriched} events`,
    scanned: events.rows.length,
    enriched
  };
});
```

---

## 5. 資料品質改進建議

### 5.1 改進事件摘要品質

**現況**: Wikidata description 通常很短 (1 句話)
**改進**: 使用 Wikipedia 摘要作為補充

```typescript
// 在 fetchRelatedEvents() 後處理
const enrichedEvents = await Promise.all(
  events.map(async (event) => {
    if (!event.wikipediaUrl) return event;

    const title = event.wikipediaUrl.split("/wiki/")[1];
    const summary = await WikipediaService.getPageSummary(
      decodeURIComponent(title)
    );

    return {
      ...event,
      summary: summary?.extract || event.summary,
      summarySource: summary ? "wikipedia" : "wikidata"
    };
  })
);
```

### 5.2 改進圖片處理

**現況**: Wikidata 的 P18 (image) 直接回傳 Wikimedia Commons URL
**問題**:
- URL 是原始檔案，可能很大 (數 MB)
- 沒有 thumbnail
- 沒有授權資訊

**改進**: 查詢圖片授權與 thumbnail

```typescript
static async getImageInfo(imageUrl: string): Promise<{
  thumbnailUrl: string;
  license: string;
  author: string;
  attribution: string;
} | null> {
  // 從 URL 提取檔名: https://commons.wikimedia.org/wiki/File:Example.jpg
  const fileName = imageUrl.split("/wiki/File:")[1];
  if (!fileName) return null;

  const url = `https://commons.wikimedia.org/w/api.php?` +
    `action=query&titles=File:${encodeURIComponent(fileName)}&` +
    `prop=imageinfo&iiprop=url|extmetadata&` +
    `iiurlwidth=800&format=json`;

  const response = await fetch(url, {
    headers: { "User-Agent": this.USER_AGENT }
  });

  const data = await response.json();
  const pages = data.query.pages;
  const page = pages[Object.keys(pages)[0]];
  const imageInfo = page.imageinfo?.[0];

  if (!imageInfo) return null;

  const license = imageInfo.extmetadata?.License?.value || "Unknown";
  const author = imageInfo.extmetadata?.Artist?.value || "Unknown";

  return {
    thumbnailUrl: imageInfo.thumburl || imageInfo.url,
    license,
    author,
    attribution: `${author}, ${license}, via Wikimedia Commons`
  };
}
```

### 5.3 地區名稱改進

**現況**: `regionName` 留空
**改進**: 使用 Reverse Geocoding

選項:
1. **Nominatim (OSM)** - 免費，ODbL 授權
2. **GeoNames** - 免費，CC BY 4.0
3. **Wikidata 的 P131 (located in)**

```typescript
// 使用 Nominatim
static async reverseGeocode(lat: number, lng: number): Promise<string> {
  const url = `https://nominatim.openstreetmap.org/reverse?` +
    `format=json&lat=${lat}&lon=${lng}&zoom=10&` +
    `accept-language=en`;

  const response = await fetch(url, {
    headers: { "User-Agent": this.USER_AGENT }
  });

  const data = await response.json();
  return data.address?.country ||
         data.address?.state ||
         data.address?.city ||
         "Unknown";
}
```

---

## 6. 效能與成本優化

### 6.1 Cache 策略

**建議新增 Cache 層**:
```typescript
// Simple in-memory cache with TTL
class Cache<T> {
  private store = new Map<string, { data: T; expiry: number }>();

  set(key: string, value: T, ttlMs: number) {
    this.store.set(key, {
      data: value,
      expiry: Date.now() + ttlMs
    });
  }

  get(key: string): T | null {
    const item = this.store.get(key);
    if (!item) return null;

    if (Date.now() > item.expiry) {
      this.store.delete(key);
      return null;
    }

    return item.data;
  }
}

// Usage
private static cache = new Cache<WikidataEvent[]>();

static async fetchRelatedEvents(qid: string, limit = 500) {
  const cacheKey = `events:${qid}:${limit}`;
  const cached = this.cache.get(cacheKey);
  if (cached) return cached;

  const events = await /* ... fetch logic ... */;
  this.cache.set(cacheKey, events, 3600000); // 1 hour TTL
  return events;
}
```

### 6.2 Rate Limiting 建議

| API | 官方限制 | 建議設定 |
|-----|---------|---------|
| Wikidata SPARQL | 未明確，建議 < 5 req/s | 5 req/s with exponential backoff |
| Wikipedia Action API | 200 req/s (burst), 穩定建議 < 100 req/s | 10 req/s |
| Wikipedia REST API | 200 req/s (有 CDN cache) | 10 req/s |
| Nominatim | 1 req/s | 1 req/s with 1s delay |

### 6.3 背景工作建議

**不要在請求中即時呼叫多個 API**
建議流程:
1. `/topic` 端點: 只抓取 Wikidata 基本資料 → 快速回應
2. 背景工作: 批次豐富化 (Wikipedia 摘要、圖片、地區)

```typescript
// 可使用 BullMQ (PRD 已規劃)
import { Queue } from "bullmq";

const enrichmentQueue = new Queue("event-enrichment", {
  connection: { host: "localhost", port: 6379 }
});

// 在 ingestion 後加入佇列
await enrichmentQueue.add("enrich", {
  eventIds: insertedEventIds
});

// Worker 處理
const worker = new Worker("event-enrichment", async (job) => {
  for (const eventId of job.data.eventIds) {
    await enrichEvent(eventId);
    await new Promise(resolve => setTimeout(resolve, 200));
  }
});
```

---

## 7. 授權展示與 Attribution

### 7.1 前端展示建議

根據 CC BY-SA 要求，必須:
1. ✅ 標示作者/來源
2. ✅ 標示授權類型
3. ✅ 提供授權連結
4. ✅ 標示是否有修改

**建議 UI 元件**:
```tsx
// EventDetailPanel.tsx
<div className="attribution">
  <p className="text-sm text-gray-600">
    Content from{" "}
    <a href={event.wikipediaUrl} target="_blank" rel="noopener">
      Wikipedia
    </a>
    , licensed under{" "}
    <a
      href="https://creativecommons.org/licenses/by-sa/4.0/"
      target="_blank"
      rel="noopener"
    >
      CC BY-SA 4.0
    </a>
  </p>
  {event.imageUrl && (
    <p className="text-xs text-gray-500 mt-1">
      Image: {event.imageAttribution}
    </p>
  )}
</div>
```

### 7.2 Sources 頁面改進

建議新增 `/sources` 前端頁面:
- 列出所有資料來源
- 顯示授權類型
- 提供下載/匯出功能 (符合 Share-Alike 義務)

---

## 8. 實作優先順序建議

### Phase 1: 立即改進 (本週)
- [ ] 新增 `WikipediaService` 與 REST API 整合
- [ ] 新增 `event_content` 資料表 (migration 0009)
- [ ] 改進 `WikidataService` 的錯誤處理與 rate limiting
- [ ] 新增 `/enrich-event/:id` 端點

### Phase 2: 資料品質提升 (下週)
- [ ] 實作 Reverse Geocoding (Nominatim)
- [ ] 實作圖片授權查詢
- [ ] 批次豐富化既有事件
- [ ] 新增 Cache 層

### Phase 3: 生產化準備 (2 週後)
- [ ] 新增背景工作佇列 (BullMQ)
- [ ] 前端 Attribution UI
- [ ] Sources 管理頁面
- [ ] 授權稽核工具

---

## 9. API 使用範例

### 9.1 完整工作流程範例

```typescript
// 1. 使用者搜尋 "Battle of Waterloo"
const topic = await WikidataService.searchTopic("Battle of Waterloo");
// → { id: "Q48314", label: "Battle of Waterloo", ... }

// 2. 取得相關事件
const events = await WikidataService.fetchRelatedEvents(topic.id, 50);
// → [ { title: "Battle of Waterloo", lat: 50.68, lng: 4.41, ... }, ... ]

// 3. 儲存到 DB (已實作於 ingestion.ts)

// 4. 豐富化第一個事件
const wikipediaTitle = events[0].wikipediaUrl.split("/wiki/")[1];
const summary = await WikipediaService.getPageSummary(wikipediaTitle);
// → { extract: "The Battle of Waterloo was fought...", thumbnail: {...}, ... }

// 5. 取得圖片授權
if (events[0].imageUrl) {
  const imageInfo = await WikidataService.getImageInfo(events[0].imageUrl);
  // → { thumbnailUrl: "...", license: "CC BY-SA 4.0", attribution: "..." }
}

// 6. Reverse Geocoding
const regionName = await WikidataService.reverseGeocode(
  events[0].lat,
  events[0].lng
);
// → "Belgium"
```

---

## 10. 風險與注意事項

### 10.1 技術風險
- ⚠️ **Rate Limiting**: SPARQL 查詢可能被限流 → 需實作 retry + backoff
- ⚠️ **資料不一致**: Wikipedia 內容可能被編輯 → 保留 `retrieved_at`
- ⚠️ **授權變更**: 圖片授權可能改變 → 定期重新驗證

### 10.2 授權風險
- ⚠️ **CC BY-SA Share-Alike 義務**: 若使用 Wikipedia 內容，整個資料集需 CC BY-SA
  - **解決方案**: 分層儲存 (核心資料 CC0，Wikipedia 內容分開)
- ⚠️ **圖片授權混雜**: Wikimedia Commons 有各種授權
  - **解決方案**: 只使用 CC0/CC BY 圖片，拒絕 NC/ND

### 10.3 效能風險
- ⚠️ **SPARQL 查詢慢**: 複雜查詢可能 > 10s
  - **解決方案**: 背景工作 + Cache
- ⚠️ **API 可用性**: Wikipedia 可能短暫不可用
  - **解決方案**: Retry logic + fallback to cached data

---

## 11. 延伸閱讀

### 11.1 官方文件
- Wikidata Query Service: https://query.wikidata.org/
- Wikipedia API: https://www.mediawiki.org/wiki/API:Main_page
- Wikipedia REST API: https://en.wikipedia.org/api/rest_v1/
- Wikimedia Terms of Use: https://foundation.wikimedia.org/wiki/Terms_of_Use
- CC BY-SA 4.0: https://creativecommons.org/licenses/by-sa/4.0/

### 11.2 相關工具
- Wikidata Query Builder: https://query.wikidata.org/querybuilder/
- SPARQL 教學: https://www.wikidata.org/wiki/Wikidata:SPARQL_tutorial
- Nominatim (OSM Geocoding): https://nominatim.org/

---

## 12. 總結

### ✅ 你的專案已經做得很好
- Wikidata SPARQL 整合完整
- 資料模型支援完整授權追蹤
- 多語言支援

### 🚀 建議優先改進
1. **新增 Wikipedia REST API** - 取得更好的摘要與圖片
2. **分層儲存授權** - 避免 CC BY-SA 義務擴散
3. **Rate Limiting + Cache** - 提升效能與穩定性
4. **背景豐富化** - 不阻塞使用者請求

### 📋 下一步行動
建議開票到 `docs/TICKET_BACKLOG.md`:
- `[T-WIKI-1]` 新增 WikipediaService 與 REST API 整合
- `[T-WIKI-2]` 新增 event_content 資料表 migration
- `[T-WIKI-3]` 實作圖片授權查詢與 thumbnail
- `[T-WIKI-4]` 新增 Rate Limiter 與 Cache 機制
- `[T-WIKI-5]` 前端 Attribution UI 元件

---

**作者**: Claude (Earthistory AI Dev)
**審閱**: 待人工審閱
**狀態**: Draft v1.0
