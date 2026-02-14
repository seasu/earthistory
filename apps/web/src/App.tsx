import { useCallback, useEffect, useMemo, useState } from "react";
import { MapViewport } from "./map/MapViewport";
import { MapMode } from "./map/types";
import { useLocale } from "./i18n";

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
  imageUrl: string | null;
  imageAttribution: string | null;
  wikipediaUrl: string | null;
};

type ListResponse<T> = {
  total: number;
  items: T[];
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";
const TIMELINE_MIN_YEAR = -3500;
const TIMELINE_MAX_YEAR = 2026;
const WINDOW_SIZE = 50;
const MOBILE_BREAKPOINT = 768;

const fetchJson = async <T,>(path: string, signal?: AbortSignal): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, { signal });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
};

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth <= MOBILE_BREAKPOINT : false
  );

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    setIsMobile(mql.matches);
    return () => mql.removeEventListener("change", handler);
  }, []);

  return isMobile;
};

export const App = () => {
  const isMobile = useIsMobile();
  const { locale, setLocale, t, formatYear, tCategory, tPrecision } = useLocale();
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
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [mobileEventsOpen, setMobileEventsOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Close panels when switching between mobile/desktop
  useEffect(() => {
    setSidebarOpen(!isMobile);
    setMobileEventsOpen(false);
    setMobileFiltersOpen(false);
  }, [isMobile]);

  // Reset filters when locale changes (region names differ per locale)
  useEffect(() => {
    setRegionFilter("all");
  }, [locale]);

  useEffect(() => {
    const controller = new AbortController();
    const loadRegions = async () => {
      setIsLoadingRegions(true);
      setRegionsError(null);
      try {
        const data = await fetchJson<ListResponse<string>>(`/regions?locale=${locale}`, controller.signal);
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
  }, [reloadToken, locale]);

  useEffect(() => {
    const controller = new AbortController();
    const loadEvents = async () => {
      setIsLoadingEvents(true);
      setEventsError(null);

      const params = new URLSearchParams({
        from: String(activeYear - WINDOW_SIZE),
        to: String(activeYear + WINDOW_SIZE),
        limit: "200",
        locale
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
  }, [activeYear, categoryFilter, reloadToken, locale]);

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

  const selectedEventIndex = useMemo(() => {
    if (selectedEventId === null) return 0;
    const idx = filteredEvents.findIndex((e) => e.id === selectedEventId);
    return idx >= 0 ? idx : 0;
  }, [filteredEvents, selectedEventId]);

  const selectedEvent =
    filteredEvents.find((event) => event.id === selectedEventId) ?? filteredEvents[0] ?? null;

  const flyToLocation = selectedEvent
    ? { lat: selectedEvent.lat, lng: selectedEvent.lng }
    : null;

  const goToPrevEvent = useCallback(() => {
    if (filteredEvents.length === 0) return;
    const prevIdx = selectedEventIndex > 0 ? selectedEventIndex - 1 : filteredEvents.length - 1;
    setSelectedEventId(filteredEvents[prevIdx].id);
  }, [filteredEvents, selectedEventIndex]);

  const goToNextEvent = useCallback(() => {
    if (filteredEvents.length === 0) return;
    const nextIdx = selectedEventIndex < filteredEvents.length - 1 ? selectedEventIndex + 1 : 0;
    setSelectedEventId(filteredEvents[nextIdx].id);
  }, [filteredEvents, selectedEventIndex]);

  const hasEventError = Boolean(eventsError);
  const hasRegionError = Boolean(regionsError);
  const isAnyLoading = isLoadingEvents || isLoadingRegions;

  const handleEventSelect = useCallback((eventId: number) => {
    setSelectedEventId(eventId);
    if (isMobile) {
      setMobileEventsOpen(true);
    }
  }, [isMobile]);

  const toggleMobileEvents = useCallback(() => {
    setMobileEventsOpen((v) => !v);
    setMobileFiltersOpen(false);
  }, []);

  const toggleMobileFilters = useCallback(() => {
    setMobileFiltersOpen((v) => !v);
    setMobileEventsOpen(false);
  }, []);

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
          onEventSelect={handleEventSelect}
          flyToLocation={flyToLocation}
        />
      </div>

      {/* Top-right controls: mode switch + language */}
      <div className="overlay-mode-switch">
        <button
          className="locale-switch"
          onClick={() => setLocale(locale === "en" ? "zh-TW" : "en")}
          type="button"
          aria-label="Switch language"
        >
          {locale === "en" ? "\u4e2d" : "EN"}
        </button>
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

      {/* Timeline */}
      <div className="overlay-timeline">
        <div className="timeline-track">
          <label htmlFor="active-year">
            <strong>{formatYear(activeYear)}</strong>
            <span className="window-hint">{t("windowHint")}</span>
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
      </div>

      {/* Desktop: Filters overlay */}
      {!isMobile && (
        <div className="overlay-filters-desktop">
          <div className="filter-row">
            <label className="control">
              {t("category")}
              <select
                onChange={(event) => setCategoryFilter(event.target.value)}
                value={categoryFilter}
              >
                <option value="all">{t("allCategories")}</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {tCategory(category)}
                  </option>
                ))}
              </select>
            </label>
            <label className="control">
              {t("region")}
              <select onChange={(event) => setRegionFilter(event.target.value)} value={regionFilter}>
                <option value="all">{t("allRegions")}</option>
                {regions.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
            </label>
            <label className="control">
              {t("keyword")}
              <input
                onChange={(event) => setKeyword(event.target.value)}
                placeholder={t("searchPlaceholder")}
                type="text"
                value={keyword}
              />
            </label>
          </div>
          {hasRegionError && <p className="status error">{t("regionError")}{regionsError}</p>}
        </div>
      )}

      {/* Desktop: sidebar toggle button */}
      {!isMobile && (
        <button
          className={`sidebar-toggle ${sidebarOpen ? "open" : ""}`}
          onClick={() => setSidebarOpen((v) => !v)}
          type="button"
          aria-label={sidebarOpen ? t("collapse") : t("expand")}
        >
          {sidebarOpen ? "\u25C0" : "\u25B6"}
        </button>
      )}

      {/* Desktop: Events sidebar */}
      {!isMobile && (
        <aside className={`overlay-events ${sidebarOpen ? "" : "collapsed"}`}>
          <div className="overlay-events-header">
            <div className="overlay-events-header-text">
              <h2>{t("events")}</h2>
              <p className="event-count">{t("eventsInView", { count: filteredEvents.length })}</p>
            </div>
          </div>

          {isAnyLoading && <p className="status loading">{t("loading")}</p>}
          {hasEventError && (
            <div className="status error">
              <p>{t("eventError")}{eventsError}</p>
              <button onClick={() => setReloadToken((value) => value + 1)} type="button">
                {t("retry")}
              </button>
            </div>
          )}

          <div className="event-list" aria-label="Filtered events">
            {!isLoadingEvents && !hasEventError && filteredEvents.length === 0 && (
              <p className="empty">{t("noEvents")}</p>
            )}
            {filteredEvents.map((event) => (
              <button
                className={`event-list-item ${event.id === selectedEvent?.id ? "active" : ""}`}
                key={event.id}
                onClick={() => setSelectedEventId(event.id)}
                type="button"
              >
                {event.imageUrl && (
                  <img
                    className="event-list-thumb"
                    src={event.imageUrl}
                    alt=""
                    loading="lazy"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                )}
                <div className="event-list-text">
                  <strong>{event.title}</strong>
                  <span>
                    {formatYear(event.timeStart)}
                    {event.timeEnd ? ` \u2013 ${formatYear(event.timeEnd)}` : ""}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {selectedEvent && (
            <article className="event-detail" aria-live="polite">
              {selectedEvent.imageUrl && (
                <div className="event-detail-hero">
                  <img
                    src={selectedEvent.imageUrl}
                    alt={selectedEvent.title}
                    loading="lazy"
                    onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = "none"; }}
                  />
                  {selectedEvent.imageAttribution && (
                    <span className="image-attribution">{selectedEvent.imageAttribution}</span>
                  )}
                </div>
              )}
              <div className="event-detail-body">
                <p className="pill">{tCategory(selectedEvent.category)}</p>
                <h3>{selectedEvent.title}</h3>
                <p className="event-summary">{selectedEvent.summary}</p>
                <ul>
                  <li>{t("regionLabel")}{selectedEvent.regionName}</li>
                  <li>
                    {t("timeLabel")}{formatYear(selectedEvent.timeStart)}
                    {selectedEvent.timeEnd ? ` \u2013 ${formatYear(selectedEvent.timeEnd)}` : ""}
                  </li>
                  <li>{t("precisionLabel")}{tPrecision(selectedEvent.precisionLevel)}</li>
                  <li>{t("confidenceLabel")}{(selectedEvent.confidenceScore * 100).toFixed(0)}%</li>
                </ul>
                <div className="event-detail-links">
                  <a href={selectedEvent.sourceUrl} rel="noreferrer" target="_blank">
                    {t("source")}
                  </a>
                  {selectedEvent.wikipediaUrl && (
                    <a href={selectedEvent.wikipediaUrl} rel="noreferrer" target="_blank">
                      Wikipedia
                    </a>
                  )}
                </div>
              </div>
            </article>
          )}
        </aside>
      )}

      {/* Mobile: FAB icons at bottom corners */}
      {isMobile && (
        <>
          <button
            className={`mobile-fab mobile-fab-events ${mobileEventsOpen ? "active" : ""}`}
            onClick={toggleMobileEvents}
            type="button"
            aria-label={t("toggleEvents")}
          >
            {"\u2630"}
          </button>

          <button
            className={`mobile-fab mobile-fab-filters ${mobileFiltersOpen ? "active" : ""}`}
            onClick={toggleMobileFilters}
            type="button"
            aria-label={t("toggleFilters")}
          >
            {"\u2699"}
          </button>

          {(mobileEventsOpen || mobileFiltersOpen) && (
            <div
              className="mobile-backdrop"
              onClick={() => { setMobileEventsOpen(false); setMobileFiltersOpen(false); }}
            />
          )}

          {/* Mobile: Events card popup */}
          <aside className={`mobile-popup mobile-popup-events ${mobileEventsOpen ? "open" : ""}`}>
            <div className="mobile-popup-header">
              <h2>{t("events")}</h2>
              <span className="event-count">{selectedEventIndex + 1} / {filteredEvents.length}</span>
              <button
                onClick={() => setMobileEventsOpen(false)}
                type="button"
                aria-label={t("closeEvents")}
              >
                {"\u2715"}
              </button>
            </div>

            {isAnyLoading && <p className="status loading">{t("loading")}</p>}
            {hasEventError && (
              <div className="status error">
                <p>{t("eventError")}{eventsError}</p>
                <button onClick={() => setReloadToken((value) => value + 1)} type="button">
                  {t("retry")}
                </button>
              </div>
            )}

            {!isLoadingEvents && !hasEventError && filteredEvents.length === 0 && (
              <p className="empty" style={{ margin: 16 }}>{t("noEvents")}</p>
            )}

            {selectedEvent && (
              <div className="mobile-card-carousel">
                <button
                  className="carousel-arrow carousel-arrow-left"
                  onClick={goToPrevEvent}
                  type="button"
                  aria-label={t("prevEvent")}
                  disabled={filteredEvents.length <= 1}
                >
                  {"\u2039"}
                </button>

                <article className="mobile-event-card" aria-live="polite">
                  {selectedEvent.imageUrl && (
                    <div className="mobile-card-hero">
                      <img
                        src={selectedEvent.imageUrl}
                        alt={selectedEvent.title}
                        loading="lazy"
                        onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = "none"; }}
                      />
                      {selectedEvent.imageAttribution && (
                        <span className="image-attribution">{selectedEvent.imageAttribution}</span>
                      )}
                    </div>
                  )}
                  <div className="mobile-card-body">
                    <p className="pill">{tCategory(selectedEvent.category)}</p>
                    <h3>{selectedEvent.title}</h3>
                    <p className="mobile-card-time">
                      {formatYear(selectedEvent.timeStart)}
                      {selectedEvent.timeEnd ? ` \u2013 ${formatYear(selectedEvent.timeEnd)}` : ""}
                    </p>
                    <p className="event-summary">{selectedEvent.summary}</p>
                    <ul>
                      <li>{t("regionLabel")}{selectedEvent.regionName}</li>
                      <li>{t("precisionLabel")}{tPrecision(selectedEvent.precisionLevel)}</li>
                      <li>{t("confidenceLabel")}{(selectedEvent.confidenceScore * 100).toFixed(0)}%</li>
                    </ul>
                    <div className="event-detail-links">
                      <a href={selectedEvent.sourceUrl} rel="noreferrer" target="_blank">
                        {t("source")}
                      </a>
                      {selectedEvent.wikipediaUrl && (
                        <a href={selectedEvent.wikipediaUrl} rel="noreferrer" target="_blank">
                          Wikipedia
                        </a>
                      )}
                    </div>
                  </div>
                </article>

                <button
                  className="carousel-arrow carousel-arrow-right"
                  onClick={goToNextEvent}
                  type="button"
                  aria-label={t("nextEvent")}
                  disabled={filteredEvents.length <= 1}
                >
                  {"\u203A"}
                </button>
              </div>
            )}
          </aside>

          {/* Mobile: Filters popup */}
          <div className={`mobile-popup mobile-popup-filters ${mobileFiltersOpen ? "open" : ""}`}>
            <div className="mobile-popup-header">
              <h2>{t("filters")}</h2>
              <button
                onClick={() => setMobileFiltersOpen(false)}
                type="button"
                aria-label={t("closeFilters")}
              >
                {"\u2715"}
              </button>
            </div>
            <div className="mobile-filter-controls">
              <label className="control">
                {t("category")}
                <select
                  onChange={(event) => setCategoryFilter(event.target.value)}
                  value={categoryFilter}
                >
                  <option value="all">{t("allCategories")}</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {tCategory(category)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="control">
                {t("region")}
                <select onChange={(event) => setRegionFilter(event.target.value)} value={regionFilter}>
                  <option value="all">{t("allRegions")}</option>
                  {regions.map((region) => (
                    <option key={region} value={region}>
                      {region}
                    </option>
                  ))}
                </select>
              </label>
              <label className="control">
                {t("keyword")}
                <input
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder={t("searchPlaceholder")}
                  type="text"
                  value={keyword}
                />
              </label>
            </div>
            {hasRegionError && <p className="status error">{t("regionError")}{regionsError}</p>}
          </div>
        </>
      )}
    </div>
  );
};
