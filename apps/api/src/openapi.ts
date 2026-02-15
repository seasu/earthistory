export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Earthistory API",
    version: "0.1.0"
  },
  paths: {
    "/events": {
      get: {
        summary: "List historical events",
        parameters: [
          { name: "category", in: "query", schema: { type: "string" } },
          { name: "from", in: "query", schema: { type: "integer" } },
          { name: "to", in: "query", schema: { type: "integer" } },
          { name: "hasYouTube", in: "query", schema: { type: "boolean" } },
          { name: "limit", in: "query", schema: { type: "integer" } }
        ]
      }
    },
    "/search": {
      get: {
        summary: "Search events by keyword",
        parameters: [{ name: "q", in: "query", schema: { type: "string" } }]
      }
    },
    "/regions": {
      get: {
        summary: "List available regions"
      }
    },
    "/sources": {
      get: {
        summary: "List data sources"
      }
    }
  }
};