import { writeFile } from "fs/promises";
import path from "path";

const QUERY = `
SELECT ?event ?eventLabel ?eventDescription ?date ?coord ?article ?image WHERE {
  ?event wdt:P31/wdt:P279* wd:Q1190554;
         wdt:P625 ?coord;
         wdt:P585 ?date.
  OPTIONAL { ?article schema:about ?event; schema:isPartOf <https://en.wikipedia.org/>. }
  OPTIONAL { ?event wdt:P18 ?image. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
LIMIT 2000
`;

const fetchWikidata = async () => {
    const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(QUERY)}&format=json`;

    console.log("Fetching data from Wikidata...");
    const response = await fetch(url, {
        headers: {
            "User-Agent": "Earthistory/1.0 (seasu@example.com)",
            "Accept": "application/json"
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.statusText}`);
    }

    const data = await response.json();
    const bindings = data.results.bindings;

    console.log(`Fetched ${bindings.length} events.`);

    const events = bindings.map((item: any, index: number) => {
        // Parse coordinates "Point(lng lat)"
        const wkt = item.coord.value;
        const match = wkt.match(/Point\(([-0-9.]+) ([-0-9.]+)\)/);
        const lng = match ? parseFloat(match[1]) : 0;
        const lat = match ? parseFloat(match[2]) : 0;

        // Parse date (simplified year handling)
        const dateStr = item.date.value;
        const year = new Date(dateStr).getFullYear();

        return {
            id: `wd-${index}`,
            title: item.eventLabel.value,
            summary: item.eventDescription?.value || "No description available.",
            category: "history", // Default category
            region_name: "",
            precision_level: "year",
            confidence_score: 1.0,
            time_start: year,
            time_end: null,
            source_id: "wikidata-source",
            source_url: item.event.value,
            location: {
                type: "Point",
                coordinates: [lng, lat]
            },
            image_url: item.image?.value || null,
            wikipedia_url: item.article?.value || null
        };
    });

    const output = {
        sources: [{
            id: "wikidata-source",
            source_name: "Wikidata",
            source_url: "https://www.wikidata.org/",
            license: "CC0",
            attribution_text: "Data from Wikidata",
            retrieved_at: new Date().toISOString()
        }],
        events
    };

    const outputPath = path.resolve(process.cwd(), "infra/data/seed/wikidata-events.json");
    await writeFile(outputPath, JSON.stringify(output, null, 2));
    console.log(`Saved ${events.length} events to ${outputPath}`);
};

fetchWikidata().catch(console.error);
