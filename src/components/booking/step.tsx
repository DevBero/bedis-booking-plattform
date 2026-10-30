"use client";

import { ChevronLeft } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// One wizard page. It slides in from the side it comes from (forward = from the right). When it appears after
// the visitor's choice, focus moves to its heading so keyboard and screen-reader users continue right there.
export function Step({
  number,
  title,
  children,
  focusOnMount = false,
  direction = "forward",
  onBack,
  className,
}: {
  number: number;
  title: string;
  children: ReactNode;
  focusOnMount?: boolean;
  direction?: "forward" | "back";
  onBack?: () => void;
  className?: string;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (!focusOnMount) return;
    heading.current?.focus({ preventScroll: true });
    heading.current?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [focusOnMount]);
  return (
    <section className={cn(direction === "forward" ? "animate-slide-next" : "animate-slide-prev", "scroll-mt-4", className)} aria-labelledby={`step-${number}`}>
      {onBack && (
        <button type="button" onClick={onBack} className="-ml-1 mb-2 inline-flex min-h-touch items-center gap-1 pr-2 text-small font-semibold text-accent underline-offset-4 hover:underline">
          <ChevronLeft aria-hidden className="size-4" />
          Zurück
        </button>
      )}
      <h2 id={`step-${number}`} ref={heading} tabIndex={-1} className="text-title focus:outline-none">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}
