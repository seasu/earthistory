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
  lat: number;
  lng: number;
};

type ListResponse<T> = {
  total: number;
  items: T[];
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";
const TIMELINE_MIN_YEAR = -3500;
const TIMELINE_MAX_YEAR = 2026;
const WINDOW_SIZE = 50;

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
  const [mode, setMode] = useState<MapMode>("maplibre");
  const [activeYear, setActiveYear] = useState(1450);
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
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
        from: String(activeYear - WINDOW_SIZE),
        to: String(activeYear + WINDOW_SIZE),
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
  }, [activeYear, categoryFilter, reloadToken]);

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

  const flyToLocation = selectedEvent
    ? { lat: selectedEvent.lat, lng: selectedEvent.lng }
    : null;

  const hasEventError = Boolean(eventsError);
  const hasRegionError = Boolean(regionsError);
  const isAnyLoading = isLoadingEvents || isLoadingRegions;

  return (
    <div className="app-root">
      {/* Fullscreen map layer */}
      <div className="map-container">
        <MapViewport
          mode={mode}
          events={filteredEvents.map((e) => ({
            id: e.id,
            title: e.title,
            category: e.category,
            lat: e.lat,
            lng: e.lng,
            timeStart: e.timeStart,
            timeEnd: e.timeEnd
          }))}
          selectedEventId={selectedEventId}
          onEventSelect={setSelectedEventId}
          flyToLocation={flyToLocation}
        />
      </div>

      {/* Map mode toggle — top right */}
      <div className="overlay-mode-switch">
        <button
          className={mode === "cesium" ? "active" : ""}
          onClick={() => setMode("cesium")}
          type="button"
        >
          3D
        </button>
        <button
          className={mode === "maplibre" ? "active" : ""}
          onClick={() => setMode("maplibre")}
          type="button"
        >
          2D
        </button>
      </div>

      {/* Timeline + Filters overlay — top center */}
      <div className="overlay-top">
        <div className="timeline-track">
          <label htmlFor="active-year">
            <strong>{formatYear(activeYear)}</strong>
            <span className="window-hint">{"\u00B1"}50 years</span>
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
        <div className="filter-row">
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
              placeholder="Search..."
              type="text"
              value={keyword}
            />
          </label>
        </div>
        {hasRegionError && <p className="status error">Region error: {regionsError}</p>}
      </div>

      {/* Sidebar toggle button */}
      <button
        className={`sidebar-toggle ${sidebarOpen ? "open" : ""}`}
        onClick={() => setSidebarOpen((v) => !v)}
        type="button"
        aria-label={sidebarOpen ? "Collapse event panel" : "Expand event panel"}
      >
        {sidebarOpen ? "\u25C0" : "\u25B6"}
      </button>

      {/* Events sidebar — left side */}
      <aside className={`overlay-events ${sidebarOpen ? "" : "collapsed"}`}>
        <div className="overlay-events-header">
          <h2>Events</h2>
          <p className="event-count">{filteredEvents.length} events in view</p>
        </div>

        {isAnyLoading && <p className="status loading">Loading...</p>}
        {hasEventError && (
          <div className="status error">
            <p>Event load error: {eventsError}</p>
            <button onClick={() => setReloadToken((value) => value + 1)} type="button">
              Retry
            </button>
          </div>
        )}

        <div className="event-list" aria-label="Filtered events">
          {!isLoadingEvents && !hasEventError && filteredEvents.length === 0 && (
            <p className="empty">No events in this time window.</p>
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
                {event.timeEnd ? ` \u2013 ${formatYear(event.timeEnd)}` : ""}
              </span>
            </button>
          ))}
        </div>

        {selectedEvent && (
          <article className="event-detail" aria-live="polite">
            <p className="pill">{selectedEvent.category}</p>
            <h3>{selectedEvent.title}</h3>
            <p className="event-summary">{selectedEvent.summary}</p>
            <ul>
              <li>Region: {selectedEvent.regionName}</li>
              <li>
                Time: {formatYear(selectedEvent.timeStart)}
                {selectedEvent.timeEnd ? ` \u2013 ${formatYear(selectedEvent.timeEnd)}` : ""}
              </li>
              <li>Precision: {selectedEvent.precisionLevel}</li>
              <li>Confidence: {(selectedEvent.confidenceScore * 100).toFixed(0)}%</li>
            </ul>
            <a href={selectedEvent.sourceUrl} rel="noreferrer" target="_blank">
              Source
            </a>
          </article>
        )}
      </aside>
    </div>
  );
};
