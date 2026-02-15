
import { FastifyPluginAsync } from "fastify";
import { WikidataService } from "../services/wikidata.service.js";
import { getPool } from "../db.js";

// Helper function to suggest better topics when 0 events found
function getTopicSuggestions(topic: string): string[] {
  const lowerTopic = topic.toLowerCase();

  // Chinese/中華/中國 related
  if (lowerTopic.includes('chinese') || lowerTopic.includes('中華') || lowerTopic.includes('中国') || lowerTopic.includes('中國')) {
    return ['Tang Dynasty', 'Ming Dynasty', 'Qing Dynasty', 'Han Dynasty', 'Song Dynasty'];
  }

  // Generic culture
  if (lowerTopic.includes('culture') || lowerTopic.includes('文化')) {
    return ['Try a specific dynasty or time period', 'Try a specific historical event', 'Try a specific war or empire'];
  }

  // European
  if (lowerTopic.includes('european') || lowerTopic.includes('europe')) {
    return ['Roman Empire', 'Ancient Rome', 'Ancient Greece', 'Renaissance', 'French Revolution'];
  }

  // Default suggestions
  return ['Try a more specific topic', 'Try a historical event name', 'Try a dynasty, empire, or time period'];
}

type IngestTopicBody = {
  topic: string;
};

export const ingestionPlugin: FastifyPluginAsync = async (app) => {
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
      const suggestions = getTopicSuggestions(topic);
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

    for (const event of events) {
      try {
        // Note: ON CONFLICT (source_url) requires a unique constraint/index on source_url.
        // If not present, this will error. We should ensure the migration exists.
        const res = await pool.query(`
          INSERT INTO events (
            title, summary, category, region_name, 
            precision_level, confidence_score, time_start, time_end,
            source_url, location, image_url, wikipedia_url
          ) VALUES (
            $1, $2, $3, $4, 
            $5, $6, $7, $8, 
            $9, ST_SetSRID(ST_MakePoint($10, $11), 4326), $12, $13
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
          event.sourceUrl,
          event.lng,
          event.lat,
          event.imageUrl,
          event.wikipediaUrl
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
