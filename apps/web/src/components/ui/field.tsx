import type { InputHTMLAttributes } from "react";

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  name: string;
  hint?: string;
  error?: string;
};

export function Field({ label, name, hint, error, id, className = "", ...props }: FieldProps) {
  const fieldId = id ?? name;
  const errorId = `${fieldId}-error`;
  const hintId = `${fieldId}-hint`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={fieldId} className="text-sm font-medium text-ink">
          {label}
        </label>
        {hint ? (
          <span id={hintId} className="text-xs text-stone">
            {hint}
          </span>
        ) : null}
      </div>

      <input
        id={fieldId}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`h-12 w-full rounded-xl border bg-white px-3.5 text-[15px] text-ink transition outline-none placeholder:text-stone/60 focus:ring-2 focus:ring-ink/10 ${
          error ? "border-red-400 focus:border-red-500" : "border-line focus:border-ink"
        } ${className}`}
        {...props}
      />

      {error ? (
        <p id={errorId} className="text-xs text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
