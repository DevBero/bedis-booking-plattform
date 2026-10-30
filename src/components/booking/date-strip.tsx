"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, type KeyboardEvent } from "react";
import { dayParts, longDay } from "@/lib/format";
import type { SlotDay } from "@/lib/types";
import { cn } from "@/lib/utils";

// Horizontal row of the days with a shift. Fully booked days stay visible but disabled.
// Arrow keys move between bookable days (radio-group pattern).
export function DateStrip({ days, selected, onSelect }: { days: SlotDay[]; selected?: string; onSelect: (date: string) => void }) {
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scroller.current?.querySelector<HTMLElement>('[aria-checked="true"]');
    el?.scrollIntoView({ inline: "nearest", block: "nearest" });
  }, [selected]);

  const bookable = days.filter((d) => d.slots.length);
  function onKey(e: KeyboardEvent) {
    const i = bookable.findIndex((d) => d.date === selected);
    const next = e.key === "ArrowRight" || e.key === "ArrowDown" ? bookable[i + 1] : e.key === "ArrowLeft" || e.key === "ArrowUp" ? bookable[i - 1] : null;
    if (!next) return;
    e.preventDefault();
    onSelect(next.date);
    requestAnimationFrame(() => scroller.current?.querySelector<HTMLElement>(`[data-date="${next.date}"]`)?.focus());
  }

  const scrollBy = (dir: number) => scroller.current?.scrollBy({ left: dir * scroller.current.clientWidth * 0.8, behavior: "smooth" });

  return (
    <div className="relative -mx-4 sm:mx-0">
      <div ref={scroller} role="radiogroup" aria-label="Tag wählen" onKeyDown={onKey} className="scroll-quiet flex snap-x scroll-px-4 gap-2 overflow-x-auto px-4 pb-1 sm:scroll-px-10 sm:px-10">
        {days.map((d) => {
          const p = dayParts(d.date);
          const active = d.date === selected;
          const disabled = !d.slots.length;
          return (
            <button
              key={d.date}
              type="button"
              role="radio"
              data-date={d.date}
              aria-checked={active}
              aria-label={`${longDay(d.date)}${disabled ? ", ausgebucht" : `, ${d.slots.length} freie Zeiten`}`}
              tabIndex={active || (!selected && d === bookable[0]) ? 0 : -1}
              disabled={disabled}
              onClick={() => onSelect(d.date)}
              className={cn(
                "flex w-16 shrink-0 snap-start flex-col items-center gap-0.5 rounded-md py-2.5 transition-colors",
                active ? "bg-ink text-paper" : "bg-card shadow-card hover:bg-accent-soft",
                disabled && "bg-transparent text-muted/50 shadow-none hover:bg-transparent",
              )}
            >
              <span className="text-meta font-semibold uppercase">{p.weekday}</span>
              <span className="text-title tabular-nums">{p.day}</span>
              <span className="text-meta">{p.month}</span>
            </button>
          );
        })}
      </div>
      <button type="button" aria-hidden tabIndex={-1} onClick={() => scrollBy(-1)} className="absolute top-1/2 left-0 hidden -translate-y-1/2 rounded-pill bg-paper p-1.5 text-muted hover:bg-card sm:block">
        <ChevronLeft className="size-5" />
      </button>
      <button type="button" aria-hidden tabIndex={-1} onClick={() => scrollBy(1)} className="absolute top-1/2 right-0 hidden -translate-y-1/2 rounded-pill bg-paper p-1.5 text-muted hover:bg-card sm:block">
        <ChevronRight className="size-5" />
      </button>
    </div>
  );
}
