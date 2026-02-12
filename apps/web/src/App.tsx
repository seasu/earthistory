import { useState } from "react";
import { MapViewport } from "./map/MapViewport";
import { MapMode } from "./map/types";

export const App = () => {
  const [mode, setMode] = useState<MapMode>("cesium");

  return (
    <main className="page">
      <header className="hero">
        <p className="kicker">Earthistory MVP</p>
        <h1>Time + Place + Event</h1>
        <p>
          Web scaffold ready. Next step is integrating map providers (Cesium / MapLibre) and
          timeline interactions.
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
        <h2>Planned Modules</h2>
        <ul>
          <li>Globe viewer container</li>
          <li>Timeline controller</li>
          <li>Event detail panel</li>
          <li>Search and filter toolbar</li>
        </ul>
      </section>
    </main>
  );
};
