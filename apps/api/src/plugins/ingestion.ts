
import { FastifyPluginAsync } from "fastify";
import { WikidataService } from "../services/wikidata.service.js";
import { TopicService } from "../services/topic.service.js";
import { getPool } from "../db.js";

// Helper function to suggest better topics when 0 events found
async function getTopicSuggestions(topic: string): Promise<string[]> {
  const lowerTopic = topic.toLowerCase();
  let manualSuggestions: string[] = [];
  let lang = "en";

  // 1. Determine language and manual suggestions
  // Chinese/中華/中國 related
  if (lowerTopic.includes('chinese') || lowerTopic.includes('中華') || lowerTopic.includes('中国') || lowerTopic.includes('中國')) {
    manualSuggestions = ['Tang Dynasty', 'Ming Dynasty', 'Qing Dynasty', 'Han Dynasty', 'Song Dynasty'];
    lang = "zh";
  }
  // Generic culture
  else if (lowerTopic.includes('culture') || lowerTopic.includes('文化')) {
    manualSuggestions = ['Try a specific dynasty or time period', 'Try a specific historical event', 'Try a specific war or empire'];
  }
  // European
  else if (lowerTopic.includes('european') || lowerTopic.includes('europe')) {
    manualSuggestions = ['Roman Empire', 'Ancient Rome', 'Ancient Greece', 'Renaissance', 'French Revolution'];
  }
  else {
    manualSuggestions = ['Try a more specific topic', 'Try a historical event name', 'Try a dynasty, empire, or time period'];
  }

  // 2. Try fetching from Wikipedia
  try {
    // A. Try getting sub-categories (if topic is a category)
    let wikiSuggestions = await WikidataService.fetchCategoryMembers(topic, lang);

    // B. If no results, try getting parent categories (if topic is a page)
    if (wikiSuggestions.length === 0) {
      wikiSuggestions = await WikidataService.fetchPageCategories(topic, lang);
    }

    if (wikiSuggestions.length > 0) {
      // Save to DB for future use
      TopicService.saveTopicHierarchy(topic, wikiSuggestions, lang).catch(console.error);

      // Return top 5 wiki suggestions
      return wikiSuggestions.slice(0, 5);
    }
  } catch (err) {
    console.error("Failed to fetch Wikipedia suggestions:", err);
  }

  // 3. Fallback to manual suggestions
  return manualSuggestions;
}

type IngestTopicBody = {
  topic: string;
};

type PreviewTopicBody = {
  topic: string;
};

type ConfirmIngestBody = {
  topic: string;
  qid: string;
};

export const ingestionPlugin: FastifyPluginAsync = async (app) => {
  // New endpoint: Preview events without inserting
  app.post<{ Body: PreviewTopicBody }>("/preview", async (request, reply) => {
    const { topic } = request.body;

    if (!topic) {
      return reply.code(400).send({ error: "Topic is required" });
    }

    app.log.info(`Previewing topic: ${topic}`);

    // 1. Search for the topic QID
    const searchResult = await WikidataService.searchTopic(topic);
    if (!searchResult) {
      return reply.code(404).send({ error: "Topic not found on Wikidata" });
    }

    app.log.info(`Found topic: ${searchResult.label} (${searchResult.id})`);

    // 2. Fetch related events
    const events = await WikidataService.fetchRelatedEvents(searchResult.id);
    app.log.info(`Fetched ${events.length} events for topic ${searchResult.label}`);

    if (events.length === 0) {
      const suggestions = await getTopicSuggestions(topic);
      return reply.send({
        message: `No events found for topic: ${searchResult.label}`,
        qid: searchResult.id,
        events: [],
        suggestions
      });
    }

    // 3. Return events for preview (formatted for UI display)
    return reply.send({
      qid: searchResult.id,
      topicLabel: searchResult.label,
      events: events.map(e => ({
        title: e.title,
        summary: e.summary,
        timeStart: e.timeStart,
        timeEnd: e.timeEnd,
        category: e.category,
        regionName: e.regionName,
        lat: e.lat,
        lng: e.lng,
        wikipediaUrl: e.wikipediaUrl,
        sourceUrl: e.sourceUrl
      }))
    });
  });

  // New endpoint: Confirm and insert events
  app.post<{ Body: ConfirmIngestBody }>("/confirm", async (request, reply) => {
    const { topic, qid } = request.body;

    if (!topic || !qid) {
      return reply.code(400).send({ error: "Topic and QID are required" });
    }

    const pool = getPool();
    if (!pool) {
      return reply.code(503).send({ error: "Database not available" });
    }

    app.log.info(`Confirming ingestion for topic: ${topic} (${qid})`);

    // Ensure a Wikidata source entry exists
    const sourceRes = await pool.query(`
      INSERT INTO sources (source_name, source_url, license, attribution_text, retrieved_at)
      VALUES ('Wikidata', 'https://www.wikidata.org', 'CC0', 'Data from Wikidata, licensed under CC0', NOW())
      ON CONFLICT (source_name, source_url) DO UPDATE SET retrieved_at = NOW()
      RETURNING id
    `);
    const sourceId = sourceRes.rows[0].id;

    // Fetch events again (we could optimize by caching, but this ensures freshness)
    const events = await WikidataService.fetchRelatedEvents(qid);

    if (events.length === 0) {
      return reply.code(404).send({ error: "No events found" });
    }

    // Insert into DB
    let insertedCount = 0;
    for (const event of events) {
      try {
        const res = await pool.query(`
          INSERT INTO events (
            title, summary, category, region_name,
            precision_level, confidence_score, time_start, time_end,
            source_id, source_url, location, image_url, wikipedia_url,
            youtube_video_id
          ) VALUES (
            $1, $2, $3, $4,
            $5, $6, $7, $8,
            $9, $10, ST_SetSRID(ST_MakePoint($11, $12), 4326), $13, $14,
            $15
          )
          ON CONFLICT (source_url) DO NOTHING
        `, [
          event.title,
          event.summary,
          event.category,
          event.regionName,
          event.precisionLevel,
          event.confidenceScore,
          event.timeStart,
          event.timeEnd,
          sourceId,
          event.sourceUrl,
          event.lng,
          event.lat,
          event.imageUrl,
          event.wikipediaUrl,
          event.youtubeVideoId ?? null,
        ]);

        insertedCount += res.rowCount || 0;
      } catch (err) {
        app.log.warn(`Failed to insert event ${event.title}: ${(err as Error).message}`);
      }
    }

    return reply.send({
      message: `Successfully ingested ${insertedCount} events for topic: ${topic}`,
      qid,
      scanned: events.length,
      inserted: insertedCount
    });
  });

  // Curated list of high-yield topics that return many image-rich events from Wikidata
  const CURATED_TOPICS = [
    // Wars & Battles
    "World War I", "World War II", "Napoleonic Wars", "American Civil War",
    "Hundred Years' War", "Crusades", "Seven Years' War", "Korean War",
    "Vietnam War", "Punic Wars", "Thirty Years' War", "War of 1812",
    // Empires & Civilizations
    "Roman Empire", "Byzantine Empire", "Ottoman Empire", "Mongol Empire",
    "British Empire", "Han Dynasty", "Tang Dynasty", "Ming Dynasty",
    "Qing Dynasty", "Mughal Empire", "Persian Empire", "Inca Empire",
    "Aztec Empire", "Ancient Egypt", "Ancient Greece",
    // Exploration & Space
    "Age of Discovery", "Apollo program", "Space Shuttle program",
    "International Space Station",
    // Revolutions & Politics
    "French Revolution", "Russian Revolution", "American Revolution",
    "Industrial Revolution", "Chinese Revolution",
    // Science & Technology
    "Manhattan Project", "History of computing", "History of aviation",
    // Culture & Religion
    "Renaissance", "Protestant Reformation", "Silk Road",
    // Natural Disasters
    "2011 Tōhoku earthquake", "1906 San Francisco earthquake",
    "2004 Indian Ocean earthquake", "Vesuvius",
  ];

  // Batch ingestion: ingest multiple curated topics at once
  app.post("/batch", async (request, reply) => {
    const pool = getPool();
    if (!pool) {
      return reply.code(503).send({ error: "Database not available" });
    }

    const results: { topic: string; events: number; status: string }[] = [];
    const body = request.body as { topics?: string[] } | undefined;
    const topics = body?.topics ?? CURATED_TOPICS;

    app.log.info(`Batch ingestion starting for ${topics.length} topics`);

    // Ensure source entry
    const sourceRes = await pool.query(`
      INSERT INTO sources (source_name, source_url, license, attribution_text, retrieved_at)
      VALUES ('Wikidata', 'https://www.wikidata.org', 'CC0', 'Data from Wikidata, licensed under CC0', NOW())
      ON CONFLICT (source_name, source_url) DO UPDATE SET retrieved_at = NOW()
      RETURNING id
    `);
    const sourceId = sourceRes.rows[0].id;

    for (const topic of topics) {
      try {
        app.log.info(`Batch: ingesting "${topic}"...`);
        const searchResult = await WikidataService.searchTopic(topic);
        if (!searchResult) {
          results.push({ topic, events: 0, status: "not_found" });
          continue;
        }

        const events = await WikidataService.fetchRelatedEvents(searchResult.id);
        let inserted = 0;

        for (const event of events) {
          try {
            const res = await pool.query(`
              INSERT INTO events (
                title, summary, category, region_name,
                precision_level, confidence_score, time_start, time_end,
                source_id, source_url, location, image_url, wikipedia_url,
                youtube_video_id
              ) VALUES (
                $1, $2, $3, $4,
                $5, $6, $7, $8,
                $9, $10, ST_SetSRID(ST_MakePoint($11, $12), 4326), $13, $14,
                $15
              )
              ON CONFLICT (source_url) DO NOTHING
            `, [
              event.title, event.summary, event.category, event.regionName,
              event.precisionLevel, event.confidenceScore,
              event.timeStart, event.timeEnd,
              sourceId, event.sourceUrl, event.lng, event.lat,
              event.imageUrl, event.wikipediaUrl,
              event.youtubeVideoId ?? null,
            ]);
            inserted += res.rowCount || 0;
          } catch { /* skip duplicates */ }
        }

        results.push({ topic, events: inserted, status: "ok" });
        app.log.info(`  → ${inserted} events inserted for "${topic}"`);
      } catch (err) {
        results.push({ topic, events: 0, status: `error: ${(err as Error).message}` });
      }
    }

    const totalInserted = results.reduce((sum, r) => sum + r.events, 0);
    return reply.send({
      message: `Batch ingestion complete: ${totalInserted} total events from ${topics.length} topics`,
      totalInserted,
      results,
    });
  });

  // GET curated topics list
  app.get("/topics", async () => {
    return { topics: CURATED_TOPICS };
  });

  // Original endpoint (kept for backwards compatibility)
  app.post<{ Body: IngestTopicBody }>("/topic", async (request, reply) => {
    const { topic } = request.body;

    if (!topic) {
      return reply.code(400).send({ error: "Topic is required" });
    }

    const pool = getPool();
    const isDevMode = !pool;

    if (isDevMode) {
      app.log.warn("Database not available - running in development mode (events will not be persisted)");
    }

    app.log.info(`Ingesting topic: ${topic}`);

    // 1. Search for the topic QID
    const searchResult = await WikidataService.searchTopic(topic);
    if (!searchResult) {
      return reply.code(404).send({ error: "Topic not found on Wikidata" });
    }

    app.log.info(`Found topic: ${searchResult.label} (${searchResult.id})`);

    // 2. Fetch related events
    const events = await WikidataService.fetchRelatedEvents(searchResult.id);
    app.log.info(`Fetched ${events.length} events for topic ${searchResult.label}`);

    if (events.length === 0) {
      const suggestions = await getTopicSuggestions(topic);
      return reply.send({
        message: `No events found for topic: ${searchResult.label}`,
        qid: searchResult.id,
        scanned: 0,
        inserted: 0,
        suggestions
      });
    }

    // 3. Insert into DB (bulk insert with conflict handling) - skip in dev mode
    let insertedCount = 0;

    if (isDevMode) {
      // Development mode: return events without database insertion
      app.log.info(`Dev mode: returning ${events.length} events without database insertion`);
      return reply.send({
        message: `[DEV MODE] Found ${events.length} events for topic: ${searchResult.label} (not persisted to database)`,
        qid: searchResult.id,
        scanned: events.length,
        inserted: 0,
        devMode: true,
        events: events.slice(0, 5).map(e => ({ title: e.title, timeStart: e.timeStart })) // Preview first 5
      });
    }

    // Ensure a Wikidata source entry exists
    const sourceRes = await pool.query(`
      INSERT INTO sources (source_name, source_url, license, attribution_text, retrieved_at)
      VALUES ('Wikidata', 'https://www.wikidata.org', 'CC0', 'Data from Wikidata, licensed under CC0', NOW())
      ON CONFLICT (source_name, source_url) DO UPDATE SET retrieved_at = NOW()
      RETURNING id
    `);
    const sourceId = sourceRes.rows[0].id;

    for (const event of events) {
      try {
        const res = await pool.query(`
          INSERT INTO events (
            title, summary, category, region_name,
            precision_level, confidence_score, time_start, time_end,
            source_id, source_url, location, image_url, wikipedia_url,
            youtube_video_id
          ) VALUES (
            $1, $2, $3, $4,
            $5, $6, $7, $8,
            $9, $10, ST_SetSRID(ST_MakePoint($11, $12), 4326), $13, $14,
            $15
          )
          ON CONFLICT (source_url) DO NOTHING
        `, [
          event.title,
          event.summary,
          event.category,
          event.regionName,
          event.precisionLevel,
          event.confidenceScore,
          event.timeStart,
          event.timeEnd,
          sourceId,
          event.sourceUrl,
          event.lng,
          event.lat,
          event.imageUrl,
          event.wikipediaUrl,
          event.youtubeVideoId ?? null,
        ]);

        insertedCount += res.rowCount || 0;
      } catch (err) {
        // Ignore errors but log
        app.log.warn(`Failed to insert event ${event.title}: ${(err as Error).message}`);
      }
    }

    return reply.send({
      message: `Successfully ingested events for topic: ${searchResult.label}`,
      qid: searchResult.id,
      scanned: events.length,
      inserted: insertedCount
    });
  });
};
