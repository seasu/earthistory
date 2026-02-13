export type MapMode = "cesium" | "maplibre";

export type MapEvent = {
  id: number;
  title: string;
  category: string;
  lat: number;
  lng: number;
  timeStart: number;
  timeEnd: number | null;
};

export type MapProviderProps = {
  className?: string;
  events?: MapEvent[];
  selectedEventId?: number | null;
  onEventSelect?: (eventId: number) => void;
  flyToLocation?: { lat: number; lng: number } | null;
};
