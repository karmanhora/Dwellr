import type { SelectHTMLAttributes } from "react";

import { FieldShell } from "./field";
import { ChevronDownIcon } from "./icons";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean };

export function Select({ className = "", invalid = false, children, ...props }: SelectProps) {
  return (
    <div className="relative">
      <select
        aria-invalid={invalid || undefined}
        className={`h-12 w-full appearance-none rounded-control border bg-paper pr-10 pl-3.5 text-body text-ink transition outline-none focus:ring-2 focus:ring-ink/10 ${
          invalid
            ? "border-danger focus:border-danger focus:ring-danger/15"
            : "border-line focus:border-ink"
        } ${className}`}
        {...props}
      >
        {children}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-stone" />
    </div>
  );
}

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  name: string;
  hint?: string;
  error?: string;
};

export function SelectField({
  label,
  name,
  hint,
  error,
  id,
  className,
  children,
  ...props
}: SelectFieldProps) {
  const fieldId = id ?? name;
  const describedBy = error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined;

  return (
    <FieldShell id={fieldId} label={label} hint={hint} error={error} className={className}>
      <Select
        id={fieldId}
        name={name}
        invalid={Boolean(error)}
        aria-describedby={describedBy}
        {...props}
      >
        {children}
      </Select>
    </FieldShell>
  );
}
