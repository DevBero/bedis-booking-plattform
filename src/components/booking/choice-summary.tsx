import type { ReactNode } from "react";

// A choice already made (service, time) as one compact row with "Ändern"
export function ChoiceSummary({ label, children, onChange, changeLabel }: { label: string; children: ReactNode; onChange: () => void; changeLabel: string }) {
  return (
    <div className="flex items-center gap-4 rounded-lg bg-card px-5 py-3 shadow-card">
      <div className="min-w-0 flex-1">
        <p className="meta text-muted">{label}</p>
        <div className="mt-0.5 font-semibold">{children}</div>
      </div>
      <button type="button" onClick={onChange} aria-label={changeLabel} className="min-h-touch shrink-0 px-2 text-small font-semibold text-accent underline-offset-4 hover:underline">
        Ändern
      </button>
    </div>
  );
}
