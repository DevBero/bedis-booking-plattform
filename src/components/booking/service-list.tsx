import { ChevronRight, Clock } from "lucide-react";
import { duration, price } from "@/lib/format";
import type { Service } from "@/lib/types";

export function ServiceList({ services, onSelect }: { services: Service[]; onSelect: (id: string) => void }) {
  return (
    <ul className="flex flex-col gap-2">
      {services.map((s) => (
        <li key={s.id}>
          <button
            type="button"
            onClick={() => onSelect(s.id)}
            className="group flex min-h-16 w-full items-center gap-4 rounded-lg bg-card px-5 py-4 text-left shadow-card transition-shadow hover:shadow-raised"
          >
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-lead font-semibold">{s.name}</span>
              {s.description && <span className="text-small text-muted">{s.description}</span>}
              <span className="mt-1 inline-flex items-center gap-1.5 text-small text-muted">
                <Clock aria-hidden className="size-3.5" />
                {duration(s.duration)}
              </span>
            </span>
            {price(s.price, s.priceFrom) && <span className="shrink-0 text-lead font-semibold tabular-nums">{price(s.price, s.priceFrom)}</span>}
            <ChevronRight aria-hidden className="size-5 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
          </button>
        </li>
      ))}
    </ul>
  );
}
