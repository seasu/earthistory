import { useCallback, useEffect, useRef, useState } from "react";

type YearCarouselProps = {
  value: number;
  min: number;
  max: number;
  onChange: (year: number) => void;
  formatYear: (year: number) => string;
  windowHint: string;
};

const TICK_SPACING = 14;
const VISIBLE_RANGE = 60;

export const YearCarousel = ({ value, min, max, onChange, formatYear, windowHint }: YearCarouselProps) => {
  const [isOpen, setIsOpen] = useState(false);
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
        setIsOpen(false);
        return;
      }
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
  }, [isOpen, onChange, clamp]);

  // Cleanup animation frame
  useEffect(() => {
    return () => { if (animFrame.current) cancelAnimationFrame(animFrame.current); };
  }, []);

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
        <span className="window-hint">{windowHint}</span>
      </button>

      {isOpen && (
        <div className="year-dial-popup" ref={dialRef}>
          <div className="year-dial-value">{formatYear(value)}</div>
          <div
            className="year-dial-track"
            onMouseDown={(e) => { e.preventDefault(); handleStart(e.clientX); }}
            onTouchStart={(e) => handleStart(e.touches[0].clientX)}
          >
            <div className="year-dial-ticks">
              {ticks.map((tick) => (
                <div
                  key={tick.year}
                  className={`year-dial-tick ${tick.type}`}
                  style={{ left: `calc(50% + ${tick.offset}px)` }}
                >
                  <div className="tick-line" />
                  {(tick.type === "major" || tick.type === "medium") && (
                    <span className="tick-label">
                      {tick.year < 0 ? `-${Math.abs(tick.year)}` : String(tick.year)}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <div className="year-dial-needle" />
          </div>
        </div>
      )}
    </>
  );
};
