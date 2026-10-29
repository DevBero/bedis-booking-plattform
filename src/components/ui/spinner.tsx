import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function Spinner({ label = "Lädt …", className }: { label?: string; className?: string }) {
  return (
    <span role="status" className={cn("inline-flex items-center gap-2 text-small text-muted", className)}>
      <LoaderCircle aria-hidden className="size-4 animate-spin" />
      {label}
    </span>
  );
}
