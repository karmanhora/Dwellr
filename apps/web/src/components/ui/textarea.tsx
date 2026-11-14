import type { TextareaHTMLAttributes } from "react";

import { FieldShell } from "./field";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean };

export function Textarea({ className = "", invalid = false, ...props }: TextareaProps) {
  return (
    <textarea
      aria-invalid={invalid || undefined}
      className={`min-h-28 w-full resize-y rounded-control border bg-paper px-3.5 py-3 text-body leading-relaxed text-ink transition outline-none placeholder:text-stone-soft focus:ring-2 focus:ring-ink/10 ${
        invalid ? "border-danger focus:border-danger focus:ring-danger/15" : "border-line focus:border-ink"
      } ${className}`}
      {...props}
    />
  );
}

type TextareaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  name: string;
  hint?: string;
  error?: string;
};

export function TextareaField({
  label,
  name,
  hint,
  error,
  id,
  className,
  ...props
}: TextareaFieldProps) {
  const fieldId = id ?? name;
  const describedBy = error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined;

  return (
    <FieldShell id={fieldId} label={label} hint={hint} error={error} className={className}>
      <Textarea
        id={fieldId}
        name={name}
        invalid={Boolean(error)}
        aria-describedby={describedBy}
        {...props}
      />
    </FieldShell>
  );
}
