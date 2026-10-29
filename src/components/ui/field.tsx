import { useId, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const control =
  "w-full rounded-md border border-line-strong bg-card px-4 text-body text-ink placeholder:text-muted/70 transition-colors focus:border-accent focus:outline-none focus-visible:outline-3 focus-visible:outline-accent aria-invalid:border-error";

type Base = { label: string; hint?: string; error?: string; optional?: boolean };

function Label({ id, label, optional }: { id: string; label: string; optional?: boolean }) {
  return (
    <label htmlFor={id} className="text-small font-semibold">
      {label}
      {optional && <span className="font-normal text-muted"> (optional)</span>}
    </label>
  );
}

function Message({ id, hint, error }: { id: string; hint?: string; error?: string }) {
  if (error)
    return (
      <p id={id} className="text-small text-error">
        {error}
      </p>
    );
  if (hint)
    return (
      <p id={id} className="text-small text-muted">
        {hint}
      </p>
    );
  return null;
}

export function Input({ label, hint, error, optional, className, ...props }: Base & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <Label id={id} label={label} optional={optional} />
      <input
        id={id}
        className={cn(control, "min-h-touch", className)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${id}-msg` : undefined}
        required={!optional}
        {...props}
      />
      <Message id={`${id}-msg`} hint={hint} error={error} />
    </div>
  );
}

export function Textarea({ label, hint, error, optional, className, ...props }: Base & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <Label id={id} label={label} optional={optional} />
      <textarea
        id={id}
        className={cn(control, "min-h-24 py-3", className)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${id}-msg` : undefined}
        required={!optional}
        {...props}
      />
      <Message id={`${id}-msg`} hint={hint} error={error} />
    </div>
  );
}
