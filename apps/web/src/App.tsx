import { useEffect, useMemo, useState } from "react";
import { MapViewport } from "./map/MapViewport";
import { MapMode } from "./map/types";

type EventRecord = {
  id: number;
  title: string;
  summary: string;
  category: string;
  regionName: string;
  precisionLevel: "year" | "decade" | "century";
  confidenceScore: number;
  timeStart: number;
  timeEnd: number | null;
  sourceUrl: string;
};

type ListResponse<T> = {
  total: number;
  items: T[];
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";
const TIMELINE_MIN_YEAR = -3000;
const TIMELINE_MAX_YEAR = 2026;

const formatYear = (value: number) => {
  if (value < 0) {
    return `${Math.abs(value)} BCE`;
  }

  return `${value} CE`;
};

const fetchJson = async <T,>(path: string, signal?: AbortSignal): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, { signal });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
};

export const App = () => {
  const [mode, setMode] = useState<MapMode>("cesium");
  const [activeYear, setActiveYear] = useState(1450);
  const [windowSize, setWindowSize] = useState(150);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [knownCategories, setKnownCategories] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [regionFilter, setRegionFilter] = useState("all");
  const [keyword, setKeyword] = useState("");
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [isLoadingRegions, setIsLoadingRegions] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [regionsError, setRegionsError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const loadRegions = async () => {
      setIsLoadingRegions(true);
      setRegionsError(null);
      try {
        const data = await fetchJson<ListResponse<string>>("/regions", controller.signal);
        setRegions(data.items);
      } catch (error) {
        if (!controller.signal.aborted) {
          setRegionsError(error instanceof Error ? error.message : "Failed to load regions");
          setRegions([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingRegions(false);
        }
      }
    };

    void loadRegions();
    return () => controller.abort();
  }, [reloadToken]);

  useEffect(() => {
    const controller = new AbortController();
    const loadEvents = async () => {
      setIsLoadingEvents(true);
      setEventsError(null);

      const params = new URLSearchParams({
        from: String(activeYear - windowSize),
        to: String(activeYear + windowSize),
        limit: "200"
      });

      if (categoryFilter !== "all") {
        params.set("category", categoryFilter);
      }

      try {
        const data = await fetchJson<ListResponse<EventRecord>>(`/events?${params.toString()}`, controller.signal);
        setEvents(data.items);
        setKnownCategories((previous) =>
          [...new Set([...previous, ...data.items.map((event) => event.category)])].sort((a, b) =>
            a.localeCompare(b)
          )
        );
      } catch (error) {
        if (!controller.signal.aborted) {
          setEventsError(error instanceof Error ? error.message : "Failed to load events");
          setEvents([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingEvents(false);
        }
      }
    };

    void loadEvents();
    return () => controller.abort();
  }, [activeYear, categoryFilter, reloadToken, windowSize]);

  const categories = useMemo(() => knownCategories, [knownCategories]);

  const filteredEvents = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return events
      .filter((event) => {
        if (regionFilter !== "all" && event.regionName !== regionFilter) {
          return false;
        }

        if (!normalizedKeyword) {
          return true;
        }

        return (
          event.title.toLowerCase().includes(normalizedKeyword) ||
          event.summary.toLowerCase().includes(normalizedKeyword)
        );
      })
      .sort((a, b) => a.timeStart - b.timeStart);
  }, [events, keyword, regionFilter]);

  useEffect(() => {
    if (filteredEvents.length === 0) {
      setSelectedEventId(null);
      return;
    }

    const currentSelectionStillVisible = filteredEvents.some((event) => event.id === selectedEventId);

    if (!currentSelectionStillVisible) {
      setSelectedEventId(filteredEvents[0].id);
    }
  }, [filteredEvents, selectedEventId]);

  const selectedEvent =
    filteredEvents.find((event) => event.id === selectedEventId) ?? filteredEvents[0] ?? null;

  const hasEventError = Boolean(eventsError);
  const hasRegionError = Boolean(regionsError);
  const isAnyLoading = isLoadingEvents || isLoadingRegions;

  return (
    <main className="page">
      <header className="hero">
        <p className="kicker">Earthistory MVP</p>
        <h1>Time + Place + Event</h1>
        <p>
          Explore history by timeline, region, and category. Switch between 3D and 2D map providers
          while inspecting filtered events.
        </p>
      </header>

      <section className="panel">
        <h2>Map Mode</h2>
        <div className="mode-switch">
          <button
            className={mode === "cesium" ? "active" : ""}
            onClick={() => setMode("cesium")}
            type="button"
          >
            Cesium (3D)
          </button>
          <button
            className={mode === "maplibre" ? "active" : ""}
            onClick={() => setMode("maplibre")}
            type="button"
          >
            MapLibre (2D)
          </button>
        </div>
        <MapViewport mode={mode} />
      </section>

      <section className="panel">
        <h2>Timeline + Filters</h2>
        <div className="timeline-layout">
          <div className="timeline-track">
            <label htmlFor="active-year">
              Active Year: <strong>{formatYear(activeYear)}</strong>
            </label>
            <input
              id="active-year"
              max={TIMELINE_MAX_YEAR}
              min={TIMELINE_MIN_YEAR}
              onChange={(event) => setActiveYear(Number(event.target.value))}
              type="range"
              value={activeYear}
            />
          </div>

          <label className="control">
            Window
            <select
              onChange={(event) => setWindowSize(Number(event.target.value))}
              value={windowSize}
            >
              <option value={25}>+/- 25 years</option>
              <option value={75}>+/- 75 years</option>
              <option value={150}>+/- 150 years</option>
              <option value={300}>+/- 300 years</option>
            </select>
          </label>

          <label className="control">
            Category
            <select
              onChange={(event) => setCategoryFilter(event.target.value)}
              value={categoryFilter}
            >
              <option value="all">All categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <label className="control">
            Region
            <select onChange={(event) => setRegionFilter(event.target.value)} value={regionFilter}>
              <option value="all">All regions</option>
              {regions.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
          </label>

          <label className="control">
            Keyword
            <input
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Search title or summary"
              type="text"
              value={keyword}
            />
          </label>
        </div>
        {hasRegionError && <p className="status error">Region load error: {regionsError}</p>}
      </section>

      <section className="panel event-panel">
        <h2>Event Panel</h2>
        <p className="event-count">{filteredEvents.length} events in current timeline window</p>
        {isAnyLoading && <p className="status loading">Loading timeline events...</p>}
        {hasEventError && (
          <div className="status error">
            <p>Event load error: {eventsError}</p>
            <button onClick={() => setReloadToken((value) => value + 1)} type="button">
              Retry
            </button>
          </div>
        )}

        <div className="event-layout">
          <aside className="event-list" aria-label="Filtered events">
            {!isLoadingEvents && !hasEventError && filteredEvents.length === 0 && (
              <p className="empty">No events matched this time window and filter set.</p>
            )}
            {filteredEvents.map((event) => (
              <button
                className={event.id === selectedEvent?.id ? "active" : ""}
                key={event.id}
                onClick={() => setSelectedEventId(event.id)}
                type="button"
              >
                <strong>{event.title}</strong>
                <span>
                  {formatYear(event.timeStart)}
                  {event.timeEnd ? ` - ${formatYear(event.timeEnd)}` : ""}
                </span>
              </button>
            ))}
          </aside>

          <article className="event-detail" aria-live="polite">
            {selectedEvent ? (
              <>
                <p className="pill">{selectedEvent.category}</p>
                <h3>{selectedEvent.title}</h3>
                <p>{selectedEvent.summary}</p>
                <ul>
                  <li>Region: {selectedEvent.regionName}</li>
                  <li>
                    Time: {formatYear(selectedEvent.timeStart)}
                    {selectedEvent.timeEnd ? ` - ${formatYear(selectedEvent.timeEnd)}` : ""}
                  </li>
                  <li>Precision: {selectedEvent.precisionLevel}</li>
                  <li>Confidence: {(selectedEvent.confidenceScore * 100).toFixed(0)}%</li>
                </ul>
                <a href={selectedEvent.sourceUrl} rel="noreferrer" target="_blank">
                  Source Link
                </a>
              </>
            ) : (
              <p>{hasEventError ? "Fix API connection and retry." : "Select an event to view details."}</p>
            )}
          </article>
        </div>
      </section>
    </main>
  );
};
