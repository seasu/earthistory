import { MapProviderProps } from "../types";

export const MapLibreProvider = ({ className }: MapProviderProps) => {
  return (
    <section className={className}>
      <h3>2D Map Provider (MapLibre)</h3>
      <p>
        Placeholder provider for T4.2. Real MapLibre map initialization will be connected in the
        next implementation step.
      </p>
    </section>
  );
};
