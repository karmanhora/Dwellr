import type { ReactNode } from "react";

type ErrorStateProps = {
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function ErrorState({
  title = "Something went wrong",
  description = "The page could not load. Try again in a moment.",
  action,
  className = "",
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center rounded-panel border border-danger/20 bg-danger-soft/50 px-6 py-14 text-center ${className}`}
    >
      <div className="text-danger" aria-hidden="true">
        <svg viewBox="0 0 32 32" width={36} height={36} fill="none" stroke="currentColor" strokeWidth={1.4}>
          <circle cx="16" cy="16" r="12" />
          <path d="M16 10v7M16 21v.5" strokeLinecap="round" />
        </svg>
      </div>
      <h2 className="mt-4 text-title font-medium text-ink">{title}</h2>
      <p className="mt-2 max-w-sm text-body-sm leading-relaxed text-stone">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
