import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
};

export function EmptyState({ title, description, action, icon, className = "" }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-panel border border-dashed border-line-strong bg-mist/50 px-6 py-16 text-center ${className}`}
    >
      <div className="text-stone" aria-hidden="true">
        {icon ?? <HomeGlyph />}
      </div>
      <h2 className="mt-5 text-title font-medium">{title}</h2>
      {description ? (
        <p className="mt-2 max-w-sm text-body-sm leading-relaxed text-stone">{description}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

function HomeGlyph() {
  return (
    <svg viewBox="0 0 32 32" width={40} height={40} fill="none" stroke="currentColor" strokeWidth={1.2} aria-hidden="true">
      <path d="M4 14 16 4l12 10v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V14Z" />
      <path d="M12 28V18h8v10" />
    </svg>
  );
}
