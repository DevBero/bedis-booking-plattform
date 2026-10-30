import { cn } from "@/lib/utils";

// Where the visitor is in the wizard: one bar segment per step, filled up to the current one
export function WizardProgress({ steps, current }: { steps: string[]; current: number }) {
  return (
    <nav aria-label="Fortschritt">
      <p className="meta text-muted">
        Schritt {current + 1} von {steps.length}
      </p>
      <ol className="mt-3 grid gap-2" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
        {steps.map((label, i) => (
          <li key={label} aria-current={i === current ? "step" : undefined} className="flex flex-col gap-2">
            <span aria-hidden className={cn("h-1 rounded-pill transition-colors duration-300", i <= current ? "bg-accent" : "bg-line")} />
            <span className={cn("text-small", i === current ? "font-semibold text-ink" : "text-muted")}>{label}</span>
          </li>
        ))}
      </ol>
    </nav>
  );
}
