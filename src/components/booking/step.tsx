"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// One step of the flow with a numbered heading. When a step appears after the visitor's choice, focus moves to
// its heading so keyboard and screen-reader users continue right there.
export function Step({ number, title, children, focusOnMount = false, className }: { number: number; title: string; children: ReactNode; focusOnMount?: boolean; className?: string }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (!focusOnMount) return;
    heading.current?.focus({ preventScroll: true });
    heading.current?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [focusOnMount]);
  return (
    <section className={cn("animate-rise scroll-mt-4", className)} aria-labelledby={`step-${number}`}>
      <h2 id={`step-${number}`} ref={heading} tabIndex={-1} className="flex items-center gap-3 text-title focus:outline-none">
        <span aria-hidden className="grid size-7 place-items-center rounded-pill bg-ink text-small font-semibold text-paper">
          {number}
        </span>
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}
