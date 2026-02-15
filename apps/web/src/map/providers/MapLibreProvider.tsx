import { useEffect, useRef, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapProviderProps } from "../types";

const CATEGORY_COLORS: Record<string, string> = {
  civilization: "#2563eb",
  war: "#dc2626",
  technology: "#16a34a",
  culture: "#9333ea",
  politics: "#ea580c",
  science: "#0891b2",
  exploration: "#ca8a04",
  religion: "#be185d"
};

const DEFAULT_COLOR = "#6b7280";

/** SVG path data for category icons (16x16 viewBox) */
const CATEGORY_ICONS: Record<string, string> = {
  civilization: "M8 1L1 6v2h2v7h4v-4h2v4h4V8h2V6L8 1z",
  war: "M4 1l1 5H1l3 4-1 5 5-3 5 3-1-5 3-4H11l1-5-4 3z",
  technology: "M8 2a6 6 0 100 12A6 6 0 008 2zm0 2a1 1 0 110 2 1 1 0 010-2zm-3 3a1 1 0 110 2 1 1 0 010-2zm6 0a1 1 0 110 2 1 1 0 010-2zM8 10a1 1 0 110 2 1 1 0 010-2z",
  culture: "M8 2C5 2 3 4 3 4v3s2 1 5 1 5-1 5-1V4s-2-2-5-2zM4 9l-1 5h2l1-3h4l1 3h2l-1-5H4z",
  politics: "M8 1L2 5v1h12V5L8 1zM3 7v5h2V7H3zm4 0v5h2V7H7zm4 0v5h2V7h-2zM2 13v1h12v-1H2z",
  science: "M6 1v5L3 11a2 2 0 002 2h6a2 2 0 002-2L10 6V1H6zm1 1h2v4.5l2.5 4.5H4.5L7 6.5V2z",
  exploration: "M8 1a7 7 0 100 14A7 7 0 008 1zm0 2l1 3h3l-2.5 2 1 3L8 9.5 5.5 11l1-3L4 6h3l1-3z",
  religion: "M7 1v3H4v2h3v8h2V6h3V4H9V1H7z"
};

let markerIdCounter = 0;

const createMarkerSvg = (category: string, isSelected: boolean): string => {
  const color = CATEGORY_COLORS[category] ?? DEFAULT_COLOR;
  const iconPath = CATEGORY_ICONS[category] ?? CATEGORY_ICONS.civilization;
  const size = isSelected ? 40 : 32;
  const pinHeight = isSelected ? 48 : 40;
  const r = size / 2;
  const filterId = `ms${markerIdCounter++}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${pinHeight}" viewBox="0 0 ${size} ${pinHeight}">
    <defs>
      <filter id="${filterId}" x="-20%" y="-10%" width="140%" height="140%">
        <feDropShadow dx="0" dy="1" stdDeviation="${isSelected ? 3 : 2}" flood-opacity="${isSelected ? 0.4 : 0.25}"/>
      </filter>
    </defs>
    <g filter="url(#${filterId})">
      <path d="M${r} ${pinHeight - 2} L${r - 6} ${size - 4} A${r - 2} ${r - 2} 0 1 1 ${r + 6} ${size - 4} Z" fill="${color}" stroke="#fff" stroke-width="${isSelected ? 2.5 : 1.5}"/>
      <g transform="translate(${(size - 16) / 2}, ${(size - 16) / 2 - 2})">
        <path d="${iconPath}" fill="#fff" fill-opacity="0.95"/>
      </g>
    </g>
  </svg>`;
};

export const MapLibreProvider = ({
  className,
  events = [],
  selectedEventId,
  onEventSelect,
  onBoundsChange,
  flyToLocation
}: MapProviderProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const onEventSelectRef = useRef(onEventSelect);
  const onBoundsChangeRef = useRef(onBoundsChange);
  onEventSelectRef.current = onEventSelect;
  onBoundsChangeRef.current = onBoundsChange;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://demotiles.maplibre.org/style.json",
      center: [30, 20],
      zoom: 2
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    mapRef.current = map;

    const updateBounds = () => {
      const bounds = map.getBounds();
      const bbox = [
        bounds.getWest(),
        bounds.getSouth(),
        bounds.getEast(),
        bounds.getNorth(),
      ].join(",");
      onBoundsChangeRef.current?.(bbox);
    };

    map.on("moveend", updateBounds);
    // Initial bounds
    map.once("load", updateBounds);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const handleMarkerClick = useCallback((eventId: number) => {
    onEventSelectRef.current?.(eventId);
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    events.forEach((event) => {
      const isSelected = event.id === selectedEventId;
      const size = isSelected ? 40 : 32;
      const pinHeight = isSelected ? 48 : 40;

      const el = document.createElement("div");
      el.innerHTML = createMarkerSvg(event.category, isSelected);
      el.style.width = `${size}px`;
      el.style.height = `${pinHeight}px`;
      el.style.cursor = "pointer";
      el.style.transition = "transform 0.15s ease";
      if (isSelected) {
        el.style.transform = "scale(1.1)";
        el.style.zIndex = "10";
      }
      el.title = event.title;

      const marker = new maplibregl.Marker({
        element: el,
        anchor: "bottom"
      })
        .setLngLat([event.lng, event.lat])
        .addTo(map);

      el.addEventListener("click", () => handleMarkerClick(event.id));

      markersRef.current.push(marker);
    });
  }, [events, selectedEventId, handleMarkerClick]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !flyToLocation) return;

    map.flyTo({
      center: [flyToLocation.lng, flyToLocation.lat],
      zoom: Math.max(map.getZoom(), 4),
      duration: 1500
    });
  }, [flyToLocation]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: "100%", height: "100%" }}
    />
  );
};
