import { time } from "@/lib/format";

const hour = (iso: string) => Number(time(iso).slice(0, 2));

// Free start times of one day, grouped into morning / afternoon / evening for quicker scanning
export function TimeGrid({ slots, onSelect }: { slots: string[]; onSelect: (iso: string) => void }) {
  const groups = [
    { label: "Vormittag", slots: slots.filter((s) => hour(s) < 12) },
    { label: "Nachmittag", slots: slots.filter((s) => hour(s) >= 12 && hour(s) < 17) },
    { label: "Abend", slots: slots.filter((s) => hour(s) >= 17) },
  ].filter((g) => g.slots.length);

  return (
    <div className="flex flex-col gap-5">
      {groups.map((g) => (
        <div key={g.label} role="group" aria-label={g.label}>
          <p className="meta mb-2 text-muted">{g.label}</p>
          <ul className="grid grid-cols-3 gap-2 min-[400px]:grid-cols-4">
            {g.slots.map((s) => (
              <li key={s}>
                <button
                  type="button"
                  onClick={() => onSelect(s)}
                  className="min-h-touch w-full rounded-md bg-card text-body font-semibold tabular-nums shadow-card transition-colors hover:bg-accent hover:text-on-accent"
                >
                  {time(s)}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
