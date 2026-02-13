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

export const MapLibreProvider = ({
  className,
  events = [],
  selectedEventId,
  onEventSelect,
  flyToLocation
}: MapProviderProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const onEventSelectRef = useRef(onEventSelect);
  onEventSelectRef.current = onEventSelect;

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
      const color = CATEGORY_COLORS[event.category] ?? DEFAULT_COLOR;
      const isSelected = event.id === selectedEventId;

      const el = document.createElement("div");
      el.style.width = isSelected ? "18px" : "12px";
      el.style.height = isSelected ? "18px" : "12px";
      el.style.borderRadius = "50%";
      el.style.backgroundColor = color;
      el.style.border = isSelected ? "3px solid #fff" : "2px solid rgba(255,255,255,0.7)";
      el.style.boxShadow = isSelected ? "0 0 8px rgba(0,0,0,0.5)" : "0 0 4px rgba(0,0,0,0.3)";
      el.style.cursor = "pointer";
      el.style.transition = "width 0.15s, height 0.15s";
      el.title = event.title;

      const marker = new maplibregl.Marker({ element: el })
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
