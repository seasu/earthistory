import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapViewport } from "./map/MapViewport";
import { MapMode } from "./map/types";
import { useLocale } from "./i18n";
import { YearCarousel } from "./YearCarousel";

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
  youtubeVideoId: string | null;
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
  const [sliderYear, setSliderYear] = useState(1450);
  const [activeYear, setActiveYear] = useState(1450);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setActiveYear(sliderYear), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [sliderYear]);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [knownCategories, setKnownCategories] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [regionFilter, setRegionFilter] = useState("all");
  const [youtubeFilter, setYoutubeFilter] = useState<"all" | "with" | "without">("all");
  const [keyword, setKeyword] = useState("");
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [isLoadingRegions, setIsLoadingRegions] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [regionsError, setRegionsError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mobileEventsOpen, setMobileEventsOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [showNoEventsToast, setShowNoEventsToast] = useState(false);
  const noEventsTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Close panels when switching between mobile/desktop
  useEffect(() => {
    setSidebarOpen(false);
    setFiltersOpen(false);
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
      if (youtubeFilter === "with") {
        params.set("hasYouTube", "true");
      } else if (youtubeFilter === "without") {
        params.set("hasYouTube", "false");
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
  }, [activeYear, categoryFilter, youtubeFilter, reloadToken, locale]);

  const categories = useMemo(() => knownCategories, [knownCategories]);

  const filteredEvents = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return events
      .filter((event) => {
        if (regionFilter !== "all" && event.regionName !== regionFilter) {
          return false;
        }
        if (youtubeFilter === "with" && !event.youtubeVideoId) {
          return false;
        }
        if (youtubeFilter === "without" && event.youtubeVideoId) {
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
  }, [events, keyword, regionFilter, youtubeFilter]);

  // Show a centered map toast when no events are found
  useEffect(() => {
    if (noEventsTimerRef.current) clearTimeout(noEventsTimerRef.current);
    if (!isLoadingEvents && !eventsError && filteredEvents.length === 0) {
      setShowNoEventsToast(true);
      noEventsTimerRef.current = setTimeout(() => setShowNoEventsToast(false), 3000);
    } else {
      setShowNoEventsToast(false);
    }
    return () => { if (noEventsTimerRef.current) clearTimeout(noEventsTimerRef.current); };
  }, [isLoadingEvents, eventsError, filteredEvents.length]);

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

  const [flyToLocation, setFlyToLocation] = useState<{ lat: number; lng: number } | null>(null);

  const goToPrevEvent = useCallback(() => {
    if (filteredEvents.length === 0) return;
    const prevIdx = selectedEventIndex > 0 ? selectedEventIndex - 1 : filteredEvents.length - 1;
    const ev = filteredEvents[prevIdx];
    setSelectedEventId(ev.id);
    setFlyToLocation({ lat: ev.lat, lng: ev.lng });
  }, [filteredEvents, selectedEventIndex]);

  const goToNextEvent = useCallback(() => {
    if (filteredEvents.length === 0) return;
    const nextIdx = selectedEventIndex < filteredEvents.length - 1 ? selectedEventIndex + 1 : 0;
    const ev = filteredEvents[nextIdx];
    setSelectedEventId(ev.id);
    setFlyToLocation({ lat: ev.lat, lng: ev.lng });
  }, [filteredEvents, selectedEventIndex]);

  const hasEventError = Boolean(eventsError);
  const hasRegionError = Boolean(regionsError);
  const isAnyLoading = isLoadingEvents || isLoadingRegions;

  const handleEventSelect = useCallback((eventId: number) => {
    setSelectedEventId(eventId);
    const ev = filteredEvents.find((e) => e.id === eventId);
    if (ev) setFlyToLocation({ lat: ev.lat, lng: ev.lng });
    if (isMobile) {
      setMobileEventsOpen(true);
    } else {
      setSidebarOpen(true);
    }
  }, [isMobile, filteredEvents]);

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

      {/* Map loading indicator */}
      {isLoadingEvents && (
        <div className="map-loading-overlay">
          <div className="map-loading-spinner" />
          <span>{t("loading")}</span>
        </div>
      )}

      {/* No-events toast */}
      {showNoEventsToast && (
        <div className="map-toast-no-events">
          {t("noEvents")}
        </div>
      )}

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

      {/* Top-center: panel icons flanking timeline */}
      <div className="overlay-top-bar">
        {!isMobile && (
          <button
            className={`panel-toggle ${sidebarOpen ? "active" : ""}`}
            onClick={() => setSidebarOpen((v) => !v)}
            type="button"
            aria-label={sidebarOpen ? t("collapse") : t("expand")}
          >
            {"\u2630"}
          </button>
        )}
        <div className="overlay-timeline">
          <YearCarousel
            value={sliderYear}
            min={TIMELINE_MIN_YEAR}
            max={TIMELINE_MAX_YEAR}
            onChange={setSliderYear}
            formatYear={formatYear}
            windowHint={t("windowHint")}
          />
        </div>
        {!isMobile && (
          <button
            className={`panel-toggle ${filtersOpen ? "active" : ""}`}
            onClick={() => setFiltersOpen((v) => !v)}
            type="button"
            aria-label={t("toggleFilters")}
          >
            {"\u{1F50D}"}
          </button>
        )}
      </div>

      {/* Desktop: Filters overlay (toggled via icon) */}
      {!isMobile && filtersOpen && (
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
              {t("youtube")}
              <select
                onChange={(event) => setYoutubeFilter(event.target.value as "all" | "with" | "without")}
                value={youtubeFilter}
              >
                <option value="all">{t("allYoutube")}</option>
                <option value="with">{t("withYoutube")}</option>
                <option value="without">{t("withoutYoutube")}</option>
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

      {/* Desktop: Event card panel */}
      {!isMobile && sidebarOpen && selectedEvent && (
        <>
          <div
            className="desktop-backdrop"
            onMouseDown={() => setSidebarOpen(false)}
          />
          <div className="desktop-event-panel">
            <button
              className="desktop-panel-close"
              onClick={() => setSidebarOpen(false)}
              type="button"
              aria-label={t("collapse")}
            >
              {"\u2715"}
            </button>

            <div className="desktop-card-content">
              {selectedEvent.youtubeVideoId ? (
                <div className="event-detail-hero event-detail-hero-video">
                  <iframe
                    src={`https://www.youtube.com/embed/${selectedEvent.youtubeVideoId}`}
                    title={selectedEvent.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : selectedEvent.imageUrl ? (
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
              ) : null}
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
            </div>

            <div className="desktop-card-footer">
              <button
                className="desktop-carousel-arrow"
                onClick={goToPrevEvent}
                type="button"
                aria-label={t("prevEvent")}
                disabled={filteredEvents.length <= 1}
              >
                {"\u2039"}
              </button>
              <span className="desktop-card-counter">
                {selectedEventIndex + 1} / {filteredEvents.length} {t("events")}
              </span>
              <button
                className="desktop-carousel-arrow"
                onClick={goToNextEvent}
                type="button"
                aria-label={t("nextEvent")}
                disabled={filteredEvents.length <= 1}
              >
                {"\u203A"}
              </button>
            </div>
          </div>
        </>
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
                  {selectedEvent.youtubeVideoId ? (
                    <div className="mobile-card-hero mobile-card-hero-video">
                      <iframe
                        src={`https://www.youtube.com/embed/${selectedEvent.youtubeVideoId}`}
                        title={selectedEvent.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : selectedEvent.imageUrl ? (
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
                  ) : null}
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
                {t("youtube")}
                <select
                  onChange={(event) => setYoutubeFilter(event.target.value as "all" | "with" | "without")}
                  value={youtubeFilter}
                >
                  <option value="all">{t("allYoutube")}</option>
                  <option value="with">{t("withYoutube")}</option>
                  <option value="without">{t("withoutYoutube")}</option>
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
