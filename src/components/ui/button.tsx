import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export const buttonStyles = cva(
  "inline-flex min-h-touch items-center justify-center gap-2 rounded-pill px-6 text-body font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-accent text-on-accent hover:bg-accent-hover",
        secondary: "bg-card text-ink shadow-card hover:bg-paper",
        ghost: "px-3 text-accent underline-offset-4 hover:underline",
      },
      width: { auto: "", full: "w-full" },
    },
    defaultVariants: { variant: "primary", width: "auto" },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonStyles> & { icon?: ReactNode };

export function Button({ variant, width, className, icon, children, type = "button", ...props }: ButtonProps) {
  return (
    <button type={type} className={cn(buttonStyles({ variant, width }), className)} {...props}>
      {icon}
      {children}
    </button>
  );
}
