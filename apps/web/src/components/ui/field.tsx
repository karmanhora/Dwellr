import type { InputHTMLAttributes, ReactNode } from "react";

import { Input } from "./input";

type FieldShellProps = {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
};

/** Label + control + hint/error, with ids wired for screen readers. */
export function FieldShell({ id, label, hint, error, children, className = "" }: FieldShellProps) {
  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-body-sm font-medium text-ink">
          {label}
        </label>
        {hint ? (
          <span id={`${id}-hint`} className="text-caption text-stone">
            {hint}
          </span>
        ) : null}
      </div>

      <div className="mt-2">{children}</div>

      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-caption text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  name: string;
  hint?: string;
  error?: string;
};

export function Field({ label, name, hint, error, id, className, ...props }: FieldProps) {
  const fieldId = id ?? name;
  const describedBy = error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined;

  return (
    <FieldShell id={fieldId} label={label} hint={hint} error={error} className={className}>
      <Input
        id={fieldId}
        name={name}
        invalid={Boolean(error)}
        aria-describedby={describedBy}
        {...props}
      />
    </FieldShell>
  );
}
