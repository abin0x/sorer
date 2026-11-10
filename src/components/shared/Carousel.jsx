import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Lightweight carousel — shows one item at a time with prev/next arrows
 * and dot indicators. Falls back to the empty message when there are no items.
 */
export default function Carousel({ items = [], renderItem, emptyMessage = "No items.", className = "" }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index >= items.length) setIndex(0);
  }, [items.length, index]);

  if (!items || items.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-3">{emptyMessage}</p>;
  }

  const prev = () => setIndex((i) => (i - 1 + items.length) % items.length);
  const next = () => setIndex((i) => (i + 1) % items.length);

  return (
    <div className={className}>
      <div className="flex items-stretch gap-2">
        {items.length > 1 && (
          <button
            onClick={prev}
            className="shrink-0 self-center p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Previous"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
        <div className="flex-1 min-w-0">
          {renderItem(items[index], index)}
        </div>
        {items.length > 1 && (
          <button
            onClick={next}
            className="shrink-0 self-center p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Next"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
      {items.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-2">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all ${i === index ? "w-6 bg-primary" : "w-1.5 bg-muted hover:bg-muted-foreground/50"}`}
              aria-label={`Go to item ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}