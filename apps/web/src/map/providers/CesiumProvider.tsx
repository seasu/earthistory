import { MapProviderProps } from "../types";

export const CesiumProvider = ({ className }: MapProviderProps) => {
  return (
    <section className={className}>
      <h3>3D Globe Provider (Cesium)</h3>
      <p>
        Placeholder provider for T4.2. Real Cesium scene setup will be connected in the next
        implementation step.
      </p>
    </section>
  );
};
