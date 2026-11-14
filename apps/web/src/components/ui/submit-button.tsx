"use client";

import { useFormStatus } from "react-dom";

type SubmitButtonProps = {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: "primary" | "quiet";
  className?: string;
};

export function SubmitButton({
  children,
  pendingLabel = "Working…",
  variant = "primary",
  className = "",
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  const variants = {
    primary: "bg-ink text-paper hover:bg-ink/90",
    quiet: "border border-line text-ink hover:border-ink/40",
  } as const;

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`inline-flex h-12 w-full items-center justify-center gap-2 rounded-full px-6 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
