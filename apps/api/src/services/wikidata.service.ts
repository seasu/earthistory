
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
        // Use UNION to search across multiple relationship types:
        // - P31/P279*: instance of / subclass of (for concrete types like "battle")
        // - P921: main subject (for events about this topic)
        // - P361: part of (for events that are part of this)
        // - P17: country (for geographical topics like "China")
        // - P276: location (for events at this location)
        const sparqlQuery = `
      SELECT DISTINCT ?event ?eventLabel ?eventDescription ?date ?coord ?article ?image ?typeLabel WHERE {
        {
          # Events that are instances/subclasses of this type
          ?event wdt:P31/wdt:P279* wd:${qid}.
        } UNION {
          # Events with this as main subject
          ?event wdt:P921 wd:${qid}.
        } UNION {
          # Events that are part of this
          ?event wdt:P361 wd:${qid}.
        } UNION {
          # Events in this country (for geographical topics)
          ?event wdt:P17 wd:${qid}.
        } UNION {
          # Events at this location
          ?event wdt:P276 wd:${qid}.
        }
        
        # Require coordinates and date
        ?event wdt:P625 ?coord;
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

    // Fetch members of a Wikipedia category (subcategories and pages)
    static async fetchCategoryMembers(topic: string, lang: string = "en"): Promise<string[]> {
        // Ensure topic has "Category:" prefix if not present
        const categoryTitle = topic.startsWith("Category:") || topic.startsWith("category:")
            ? topic
            : `Category:${topic}`;

        const url = `https://${lang}.wikipedia.org/w/api.php?action=query&list=categorymembers&cmtitle=${encodeURIComponent(categoryTitle)}&cmlimit=10&format=json&origin=*`;

        try {
            const response = await fetch(url, {
                headers: { "User-Agent": this.USER_AGENT }
            });

            if (!response.ok) return [];

            const data = await response.json();
            if (!data.query || !data.query.categorymembers) return [];

            // Filter and map results
            // ns 14 = Category, ns 0 = Page
            return data.query.categorymembers
                .map((member: any) => member.title.replace(/^Category:/, "")) // Remove "Category:" prefix for display
                .filter((title: string) => !title.includes("Template") && !title.includes("User")); // Basic filtering

        } catch (error) {
            console.error(`Wikipedia category fetch error (${lang}):`, error);
            return [];
        }
    }

    // Fetch parent categories of a Wikipedia page (reverse lookup)
    static async fetchPageCategories(topic: string, lang: string = "en"): Promise<string[]> {
        const url = `https://${lang}.wikipedia.org/w/api.php?action=query&prop=categories&titles=${encodeURIComponent(topic)}&cllimit=10&format=json&origin=*`;

        try {
            const response = await fetch(url, {
                headers: { "User-Agent": this.USER_AGENT }
            });

            if (!response.ok) return [];

            const data = await response.json();
            if (!data.query || !data.query.pages) return [];

            const pages = data.query.pages;
            const pageId = Object.keys(pages)[0];
            const categories = pages[pageId].categories;

            if (!categories) return [];

            return categories
                .map((cat: any) => cat.title.replace(/^Category:/, ""))
                .filter((title: string) =>
                    !title.includes("Template") &&
                    !title.includes("User") &&
                    !title.includes("Wikipedia") &&
                    !title.includes("維基百科") &&
                    !title.includes("條目") &&
                    !title.includes("頁面") &&
                    !title.includes("使用") &&
                    !title.includes("CS1")
                );
        } catch (error) {
            console.error(`Wikipedia page categories fetch error (${lang}):`, error);
            return [];
        }
    }
}
