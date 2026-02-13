import { CesiumProvider } from "./providers/CesiumProvider";
import { MapLibreProvider } from "./providers/MapLibreProvider";
import { MapMode, MapProviderProps } from "./types";

type MapViewportProps = Omit<MapProviderProps, "className"> & {
  mode: MapMode;
};

export const MapViewport = ({ mode, ...mapProps }: MapViewportProps) => {
  if (mode === "cesium") {
    return <CesiumProvider className="map-provider" {...mapProps} />;
  }

  return <MapLibreProvider className="map-provider" {...mapProps} />;
};
