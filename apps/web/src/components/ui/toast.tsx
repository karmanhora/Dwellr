"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ToastTone = "neutral" | "positive" | "danger";

type ToastInput = {
  title: string;
  description?: string;
  tone?: ToastTone;
};

type ToastItem = ToastInput & { id: number };

const ToastContext = createContext<((toast: ToastInput) => void) | null>(null);

const toneClasses: Record<ToastTone, string> = {
  neutral: "border-line bg-paper",
  positive: "border-moss/25 bg-moss-soft",
  danger: "border-danger/25 bg-danger-soft",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const push = useCallback(
    (toast: ToastInput) => {
      const id = Date.now() + Math.random();
      setItems((current) => [...current.slice(-2), { ...toast, id }]);
      window.setTimeout(() => dismiss(id), 5000);
    },
    [dismiss],
  );

  const value = useMemo(() => push, [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-24 z-60 flex flex-col items-center gap-2 px-4 md:right-8 md:bottom-8 md:left-auto md:items-end"
      >
        {items.map((item) => (
          <div
            key={item.id}
            className={`animate-fade-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-card border p-4 shadow-soft ${
              toneClasses[item.tone ?? "neutral"]
            }`}
          >
            <div className="min-w-0 flex-1">
              <p className="text-body-sm font-medium text-ink">{item.title}</p>
              {item.description ? (
                <p className="mt-0.5 text-caption text-stone">{item.description}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              className="text-stone transition hover:text-ink"
            >
              <span className="sr-only">Dismiss</span>
              <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                <path d="m6 6 12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}
