import type { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean };

export function Input({ className = "", invalid = false, ...props }: InputProps) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={`h-12 w-full rounded-control border bg-paper px-3.5 text-body text-ink transition outline-none placeholder:text-stone-soft focus:ring-2 focus:ring-ink/10 disabled:bg-mist disabled:text-stone ${
        invalid ? "border-danger focus:border-danger focus:ring-danger/15" : "border-line focus:border-ink"
      } ${className}`}
      {...props}
    />
  );
}
