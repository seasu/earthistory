import { CesiumProvider } from "./providers/CesiumProvider";
import { MapLibreProvider } from "./providers/MapLibreProvider";
import { MapMode } from "./types";

type MapViewportProps = {
  mode: MapMode;
};

export const MapViewport = ({ mode }: MapViewportProps) => {
  if (mode === "cesium") {
    return <CesiumProvider className="map-provider" />;
  }

  return <MapLibreProvider className="map-provider" />;
};
