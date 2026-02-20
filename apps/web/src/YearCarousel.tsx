import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type YearCarouselProps = {
  value: number;
  min: number;
  max: number;
  onChange: (year: number) => void;
  formatYear: (year: number) => string;
  windowSize: number;
  windowPresets: number[];
  onWindowSizeChange: (size: number) => void;
  density: Record<number, number>;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const TICK_SPACING = 14;
const VISIBLE_RANGE = 60;

export const YearCarousel = ({
  value, min, max, onChange, formatYear,
  windowSize, windowPresets, onWindowSizeChange,
  density, t
}: YearCarouselProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showRangeInput, setShowRangeInput] = useState(false);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const dialRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const isDragging = useRef(false);
  const didDrag = useRef(false);
  const startX = useRef(0);
  const startYear = useRef(value);
  const velocity = useRef(0);
  const lastX = useRef(0);
  const lastTime = useRef(0);
  const animFrame = useRef(0);
  const currentValue = useRef(value);

  currentValue.current = value;

  const clamp = useCallback((v: number) => Math.max(min, Math.min(max, v)), [min, max]);

  // Max density for normalizing bar heights
  const maxDensity = useMemo(() => {
    const values = Object.values(density);
    return values.length > 0 ? Math.max(...values) : 0;
  }, [density]);

  const handleStart = useCallback((clientX: number) => {
    isDragging.current = true;
    didDrag.current = false;
    startX.current = clientX;
    startYear.current = currentValue.current;
    lastX.current = clientX;
    lastTime.current = performance.now();
    velocity.current = 0;
    if (animFrame.current) {
      cancelAnimationFrame(animFrame.current);
      animFrame.current = 0;
    }
  }, []);

  const handleMove = useCallback((clientX: number) => {
    if (!isDragging.current) return;

    const now = performance.now();
    const dt = now - lastTime.current;
    if (dt > 0) {
      velocity.current = (lastX.current - clientX) / dt;
    }
    lastX.current = clientX;
    lastTime.current = now;

    const diff = startX.current - clientX;
    if (Math.abs(diff) > 3) didDrag.current = true;
    const yearDiff = Math.round(diff / TICK_SPACING);
    const newYear = clamp(startYear.current + yearDiff);
    if (newYear !== currentValue.current) {
      onChange(newYear);
    }
  }, [onChange, clamp]);

  const handleEnd = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;

    let v = velocity.current * TICK_SPACING;
    if (Math.abs(v) < 0.3) return;

    let accumulated = 0;
    const decel = () => {
      v *= 0.92;
      accumulated += v;
      if (Math.abs(v) < 0.08) return;

      const yearShift = Math.round(accumulated);
      if (yearShift !== 0) {
        accumulated -= yearShift;
        const next = clamp(currentValue.current + yearShift);
        if (next !== currentValue.current) onChange(next);
      }
      animFrame.current = requestAnimationFrame(decel);
    };
    animFrame.current = requestAnimationFrame(decel);
  }, [onChange, clamp]);

  // Attach global listeners when dial is open
  useEffect(() => {
    if (!isOpen) return;

    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX);
    const onMouseUp = () => handleEnd();
    const onTouchMove = (e: TouchEvent) => {
      if (isDragging.current) e.preventDefault();
      handleMove(e.touches[0].clientX);
    };
    const onTouchEnd = () => handleEnd();

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [isOpen, handleMove, handleEnd]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        dialRef.current && !dialRef.current.contains(target) &&
        triggerRef.current && !triggerRef.current.contains(target)
      ) {
        setIsOpen(false);
        setShowRangeInput(false);
      }
    };

    const tid = setTimeout(() => document.addEventListener("mousedown", handler), 50);
    return () => {
      clearTimeout(tid);
      document.removeEventListener("mousedown", handler);
    };
  }, [isOpen]);

  // Keyboard support
  useEffect(() => {
    if (!isOpen) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showRangeInput) {
          setShowRangeInput(false);
        } else {
          setIsOpen(false);
        }
        return;
      }
      if (showRangeInput) return; // Don't intercept keys when typing in inputs
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        onChange(clamp(currentValue.current - 1));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        onChange(clamp(currentValue.current + 1));
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        onChange(clamp(currentValue.current - 10));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        onChange(clamp(currentValue.current + 10));
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, showRangeInput, onChange, clamp]);

  // Cleanup animation frame
  useEffect(() => {
    return () => { if (animFrame.current) cancelAnimationFrame(animFrame.current); };
  }, []);

  // Prefill custom range inputs when opening
  useEffect(() => {
    if (showRangeInput) {
      setCustomFrom(String(value - windowSize));
      setCustomTo(String(value + windowSize));
    }
  }, [showRangeInput, value, windowSize]);

  const handleCustomRangeApply = () => {
    const from = parseInt(customFrom, 10);
    const to = parseInt(customTo, 10);
    if (!Number.isFinite(from) || !Number.isFinite(to) || from >= to) return;

    const center = Math.round((from + to) / 2);
    const half = Math.round((to - from) / 2);
    const clampedHalf = Math.max(1, Math.min(half, 2000));

    onChange(clamp(center));
    onWindowSizeChange(clampedHalf);
    setShowRangeInput(false);
  };

  // Build tick marks
  const ticks: { year: number; offset: number; type: "major" | "medium" | "minor" | "tiny" }[] = [];
  for (let y = value - VISIBLE_RANGE; y <= value + VISIBLE_RANGE; y++) {
    if (y < min || y > max) continue;
    const offset = (y - value) * TICK_SPACING;
    const isMajor = y % 100 === 0;
    const isMedium = y % 50 === 0;
    const isMinor = y % 10 === 0;
    ticks.push({ year: y, offset, type: isMajor ? "major" : isMedium ? "medium" : isMinor ? "minor" : "tiny" });
  }

  const windowHintText = `\u00b1${windowSize} ${t("yearUnit")}`;

  return (
    <>
      <button
        ref={triggerRef}
        className={`year-dial-trigger ${isOpen ? "active" : ""}`}
        onClick={() => setIsOpen((v) => !v)}
        type="button"
        aria-expanded={isOpen}
        aria-label="Year selector"
      >
        <strong className="year-dial-trigger-year">{formatYear(value)}</strong>
        <span className="window-hint">{windowHintText}</span>
      </button>

      {isOpen && (
        <div className="year-dial-popup" ref={dialRef}>
          <div className="year-dial-value">{formatYear(value)}</div>

          {/* Window size presets */}
          <div className="year-dial-window-controls">
            <div className="window-presets">
              {windowPresets.map((preset) => (
                <button
                  key={preset}
                  className={`window-preset-btn ${windowSize === preset ? "active" : ""}`}
                  onClick={() => onWindowSizeChange(preset)}
                  type="button"
                >
                  {`\u00b1${preset}`}
                </button>
              ))}
              <button
                className={`window-preset-btn window-custom-btn ${showRangeInput ? "active" : ""}`}
                onClick={() => setShowRangeInput((v) => !v)}
                type="button"
              >
                {t("customRange")}
              </button>
            </div>

            {/* Custom range input */}
            {showRangeInput && (
              <div className="window-custom-range">
                <input
                  type="number"
                  className="range-input"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  placeholder={t("fromYear")}
                  onKeyDown={(e) => { if (e.key === "Enter") handleCustomRangeApply(); }}
                />
                <span className="range-separator">~</span>
                <input
                  type="number"
                  className="range-input"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  placeholder={t("toYear")}
                  onKeyDown={(e) => { if (e.key === "Enter") handleCustomRangeApply(); }}
                />
                <button
                  className="range-apply-btn"
                  onClick={handleCustomRangeApply}
                  type="button"
                >
                  {t("apply")}
                </button>
              </div>
            )}
          </div>

          <div
            className="year-dial-track"
            onMouseDown={(e) => { e.preventDefault(); handleStart(e.clientX); }}
            onTouchStart={(e) => handleStart(e.touches[0].clientX)}
          >
            <div className="year-dial-ticks">
              {ticks.map((tick) => {
                const count = density[tick.year] ?? 0;
                const barHeight = maxDensity > 0 ? Math.round((count / maxDensity) * 30) : 0;

                return (
                  <div
                    key={tick.year}
                    className={`year-dial-tick ${tick.type}`}
                    style={{ left: `calc(50% + ${tick.offset}px)` }}
                  >
                    {barHeight > 0 && (
                      <div
                        className="tick-density"
                        style={{ height: `${barHeight}px` }}
                        title={`${tick.year}: ${count}`}
                      />
                    )}
                    <div className="tick-line" />
                    {(tick.type === "major" || tick.type === "medium") && (
                      <span className="tick-label">
                        {tick.year < 0 ? `-${Math.abs(tick.year)}` : String(tick.year)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="year-dial-needle" />
          </div>
        </div>
      )}
    </>
  );
};
