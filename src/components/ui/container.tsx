import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// The one content column: phone width first, never wider than a comfortable reading measure
export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-xl px-4 sm:px-6", className)}>{children}</div>;
}
