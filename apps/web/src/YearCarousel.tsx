import { useEffect, useRef, useState } from "react";

type YearCarouselProps = {
  value: number;
  min: number;
  max: number;
  onChange: (year: number) => void;
  formatYear: (year: number) => string;
};

export const YearCarousel = ({ value, min, max, onChange, formatYear }: YearCarouselProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const dragStartYear = useRef(value);

  // Generate visible years around current value
  const visibleRange = 7; // Show 7 years at a time
  const years = [];
  for (let i = -Math.floor(visibleRange / 2); i <= Math.floor(visibleRange / 2); i++) {
    const year = value + i;
    if (year >= min && year <= max) {
      years.push(year);
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.clientX);
    setScrollOffset(0);
    dragStartYear.current = value;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setStartX(e.touches[0].clientX);
    setScrollOffset(0);
    dragStartYear.current = value;
  };

  const handleMove = (clientX: number) => {
    if (!isDragging) return;

    const diff = clientX - startX;
    setScrollOffset(diff);

    // Calculate new year based on drag distance
    // Every 60px = 1 year
    const yearDiff = Math.round(-diff / 60);
    const newYear = Math.max(min, Math.min(max, dragStartYear.current + yearDiff));

    if (newYear !== value) {
      onChange(newYear);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    handleMove(e.clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    handleMove(e.touches[0].clientX);
  };

  const handleEnd = () => {
    setIsDragging(false);
    setScrollOffset(0);
  };

  const handleYearClick = (year: number) => {
    if (!isDragging && year !== value) {
      onChange(year);
    }
  };

  // Handle wheel scroll
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 1 : -1;
    const newYear = Math.max(min, Math.min(max, value + delta));
    if (newYear !== value) {
      onChange(newYear);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!containerRef.current?.contains(document.activeElement)) return;

      if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
        e.preventDefault();
        const newYear = Math.max(min, value - 1);
        if (newYear !== value) onChange(newYear);
      } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
        e.preventDefault();
        const newYear = Math.min(max, value + 1);
        if (newYear !== value) onChange(newYear);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [value, min, max, onChange]);

  return (
    <div
      ref={containerRef}
      className="year-carousel-container"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleEnd}
      onWheel={handleWheel}
      role="slider"
      aria-label="Year selector"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      tabIndex={0}
    >
      <div className="year-carousel-track" style={{ transform: `translateX(${scrollOffset}px)` }}>
        {years.map((year) => {
          const distance = Math.abs(year - value);
          const scale = distance === 0 ? 1.5 : Math.max(0.6, 1 - distance * 0.2);
          const opacity = distance === 0 ? 1 : Math.max(0.3, 1 - distance * 0.2);
          const isCentered = year === value;

          return (
            <button
              key={year}
              className={`year-carousel-item ${isCentered ? "centered" : ""}`}
              style={{
                transform: `scale(${scale})`,
                opacity,
              }}
              onClick={() => handleYearClick(year)}
              type="button"
              aria-label={formatYear(year)}
            >
              {formatYear(year)}
            </button>
          );
        })}
      </div>
      <div className="year-carousel-indicator" />
    </div>
  );
};
