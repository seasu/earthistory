import { Suspense, lazy } from "react";
import { MapMode, MapProviderProps } from "./types";

const CesiumProvider = lazy(() =>
  import("./providers/CesiumProvider").then((module) => ({
    default: module.CesiumProvider,
  }))
);

const MapLibreProvider = lazy(() =>
  import("./providers/MapLibreProvider").then((module) => ({
    default: module.MapLibreProvider,
  }))
);

type MapViewportProps = Omit<MapProviderProps, "className"> & {
  mode: MapMode;
};

export const MapViewport = ({ mode, onBoundsChange, ...mapProps }: MapViewportProps) => {
  return (
    <Suspense fallback={<div className="map-loading-placeholder" />}>
      {mode === "cesium" ? (
        <CesiumProvider
          className="map-provider"
          {...mapProps}
          onBoundsChange={onBoundsChange}
        />
      ) : (
        <MapLibreProvider
          className="map-provider"
          {...mapProps}
          onBoundsChange={onBoundsChange}
        />
      )}
    </Suspense>
  );
};

