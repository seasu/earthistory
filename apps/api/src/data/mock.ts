export type SourceRecord = {
  id: number;
  sourceName: string;
  sourceUrl: string;
  license: string;
  attributionText: string;
  retrievedAt: string;
};

export type EventRecord = {
  id: number;
  title: string;
  summary: string;
  category: string;
  regionName: string;
  precisionLevel: "year" | "decade" | "century";
  confidenceScore: number;
  timeStart: number;
  timeEnd: number | null;
  sourceId: number;
  sourceUrl: string;
};

export const sources: SourceRecord[] = [
  {
    id: 1,
    sourceName: "Wikidata",
    sourceUrl: "https://www.wikidata.org/",
    license: "CC0",
    attributionText: "Data from Wikidata",
    retrievedAt: "2026-02-13T00:00:00Z"
  },
  {
    id: 2,
    sourceName: "GeoNames",
    sourceUrl: "https://www.geonames.org/",
    license: "CC BY 4.0",
    attributionText: "Contains GeoNames data",
    retrievedAt: "2026-02-13T00:00:00Z"
  }
];

export const events: EventRecord[] = [
  {
    id: 101,
    title: "Founding of the Han Dynasty",
    summary: "Liu Bang established the Han dynasty after the fall of Qin.",
    category: "civilization",
    regionName: "China",
    precisionLevel: "year",
    confidenceScore: 0.93,
    timeStart: -202,
    timeEnd: null,
    sourceId: 1,
    sourceUrl: "https://www.wikidata.org/wiki/Q7209"
  },
  {
    id: 102,
    title: "Norman Conquest of England",
    summary: "William the Conqueror defeated Harold II at the Battle of Hastings.",
    category: "war",
    regionName: "England",
    precisionLevel: "year",
    confidenceScore: 0.96,
    timeStart: 1066,
    timeEnd: null,
    sourceId: 1,
    sourceUrl: "https://www.wikidata.org/wiki/Q175117"
  },
  {
    id: 103,
    title: "Printing Press Popularization",
    summary: "Movable type printing spread knowledge rapidly across Europe.",
    category: "technology",
    regionName: "Europe",
    precisionLevel: "decade",
    confidenceScore: 0.88,
    timeStart: 1450,
    timeEnd: 1459,
    sourceId: 2,
    sourceUrl: "https://www.geonames.org/"
  }
];
