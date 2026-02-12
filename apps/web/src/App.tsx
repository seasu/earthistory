export const App = () => {
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
