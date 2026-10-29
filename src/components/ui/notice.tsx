import { CircleAlert, CircleCheck, Info } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const TONES = {
  info: { box: "bg-accent-soft text-ink", icon: Info },
  success: { box: "bg-success-soft text-success", icon: CircleCheck },
  error: { box: "bg-error-soft text-error", icon: CircleAlert },
};

// Inline message; errors are announced by screen readers right away (role="alert"), others politely
export function Notice({ tone = "info", children, className }: { tone?: keyof typeof TONES; children: ReactNode; className?: string }) {
  const { box, icon: Icon } = TONES[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("flex items-start gap-3 rounded-md px-4 py-3 text-small", box, className)}>
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
