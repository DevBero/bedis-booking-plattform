import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Our font-size tokens (globals.css) are unknown to tailwind-merge, which would read text-body as a colour
const twMerge = extendTailwindMerge({
  extend: { theme: { text: ["display", "title", "lead", "body", "small", "meta"] } },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
