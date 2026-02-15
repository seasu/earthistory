
// apps/api/src/services/wikidata.service.ts

type WikidataEvent = {
    title: string;
    summary: string;
    category: string;
    regionName: string;
    precisionLevel: "year" | "decade" | "century";
    confidenceScore: number;
    timeStart: number;
    timeEnd: number | null;
    sourceUrl: string;
    lat: number;
    lng: number;
    imageUrl: string | null;
    wikipediaUrl: string | null;
};

// Mapping from Wikidata "instance of" (P31) labels to our App's categories
const CATEGORY_MAPPING: Record<string, string> = {
    "war": "war",
    "battle": "war",
    "siege": "war",
    "military campaign": "war",
    "conflict": "war",
    "invasion": "war",

    "election": "politics",
    "treaty": "politics",
    "assassination": "politics",
    "coup d'état": "politics",
    "protest": "politics",
    "revolution": "politics",
    "diplomatic mission": "politics",

    "painting": "culture",
    "sculpture": "culture",
    "novel": "culture",
    "film": "culture",
    "literary work": "culture",
    "composition": "culture",
    "museum": "culture",
    "festival": "culture",

    "city": "civilization",
    "capital city": "civilization",
    "archaeological site": "civilization",
    "empire": "civilization",
    "civilization": "civilization",

    "discovery": "exploration",
    "expedition": "exploration",
    "first ascent": "exploration",
    "space mission": "exploration",

    "scientific discovery": "science",
    "invention": "technology",

    "religion": "religion",
    "religious movement": "religion",
    "deity": "religion"
};

export class WikidataService {
    private static readonly USER_AGENT = "Earthistory/1.0 (seasu@example.com)";

    // Search for a topic to get its QID (e.g., "Chinese Culture" -> "Q1190554")
    static async searchTopic(query: string): Promise<{ id: string; label: string; description: string } | null> {
        const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(query)}&language=en&format=json&limit=1`;

        try {
            const response = await fetch(url, {
                headers: { "User-Agent": this.USER_AGENT }
            });

            const data = await response.json();
            if (!data.search || data.search.length === 0) return null;

            return {
                id: data.search[0].id,
                label: data.search[0].label,
                description: data.search[0].description
            };
        } catch (error) {
            console.error("Wikidata search error:", error);
            return null;
        }
    }

    // Fetch events related to a QID (instance of or part of)
    static async fetchRelatedEvents(qid: string, limit = 500): Promise<WikidataEvent[]> {
        // Added ?typeLabel to query the "instance of" label
        const sparqlQuery = `
      SELECT ?event ?eventLabel ?eventDescription ?date ?coord ?article ?image ?typeLabel WHERE {
        ?event wdt:P31/wdt:P279* wd:${qid};
               wdt:P625 ?coord;
               wdt:P585 ?date.
        OPTIONAL { ?event wdt:P31 ?type. }
        OPTIONAL { ?article schema:about ?event; schema:isPartOf <https://en.wikipedia.org/>. }
        OPTIONAL { ?event wdt:P18 ?image. }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
      }
      LIMIT ${limit}
    `;

        const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparqlQuery)}&format=json`;

        try {
            const response = await fetch(url, {
                headers: {
                    "User-Agent": this.USER_AGENT,
                    "Accept": "application/json"
                }
            });

            if (!response.ok) throw new Error(`SPARQL request failed: ${response.statusText}`);

            const data = await response.json();
            const bindings = data.results.bindings;

            return bindings.map((item: any) => {
                // Parse coordinates "Point(lng lat)"
                const wkt = item.coord.value;
                const match = wkt.match(/Point\(([-0-9.]+) ([-0-9.]+)\)/);
                const lng = match ? parseFloat(match[1]) : 0;
                const lat = match ? parseFloat(match[2]) : 0;

                const dateStr = item.date.value;
                const year = new Date(dateStr).getFullYear();

                // Smart Categorization
                const typeLabel = item.typeLabel?.value?.toLowerCase() || "";
                let category = "history"; // Default

                // Check if mapped
                if (CATEGORY_MAPPING[typeLabel]) {
                    category = CATEGORY_MAPPING[typeLabel];
                } else {
                    // Fuzzy match check (e.g. "naval battle" -> contains "battle" -> "war")
                    for (const [key, val] of Object.entries(CATEGORY_MAPPING)) {
                        if (typeLabel.includes(key)) {
                            category = val;
                            break;
                        }
                    }
                }

                return {
                    title: item.eventLabel.value,
                    summary: item.eventDescription?.value || "No description available.",
                    category,
                    regionName: "", // Would need reverse geocoding or another property
                    precisionLevel: "year",
                    confidenceScore: 1.0,
                    timeStart: year,
                    timeEnd: null,
                    sourceUrl: item.event.value,
                    lat,
                    lng,
                    imageUrl: item.image?.value || null,
                    wikipediaUrl: item.article?.value || null
                };
            });

        } catch (error) {
            console.error("Wikidata fetch error:", error);
            return [];
        }
    }
}
