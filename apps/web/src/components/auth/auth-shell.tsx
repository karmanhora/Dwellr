import type { ReactNode } from "react";

import { HouseMark, Logo } from "@/components/brand/logo";

type AuthShellProps = {
  title: string;
  description: string;
  alternate: ReactNode;
  children: ReactNode;
};

export function AuthShell({ title, description, alternate, children }: AuthShellProps) {
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-12 px-5 py-10 sm:px-8 sm:py-14 lg:grid-cols-[0.95fr_1.05fr] lg:items-stretch lg:py-16">
      <aside className="relative hidden overflow-hidden rounded-[2rem] bg-mist p-10 lg:flex lg:min-h-[36rem] lg:flex-col lg:justify-between">
        <HouseMark className="relative h-9 w-9" />
        <div className="relative max-w-xs">
          <p className="text-2xl font-medium leading-snug tracking-[-0.02em] text-ink">
            A calmer place to keep every home you&rsquo;re considering.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-stone">
            Shared collections, property profiles, and details you can actually trust.
          </p>
        </div>
        <HouseMark className="pointer-events-none absolute -right-16 -bottom-16 h-72 w-72 opacity-[0.04]" />
      </aside>

      <div className="mx-auto flex w-full max-w-md flex-col justify-center">
        <div className="mb-8 lg:hidden">
          <Logo />
        </div>

        <h1 className="text-3xl font-medium tracking-[-0.03em] text-ink sm:text-4xl">{title}</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-stone">{description}</p>

        <div className="mt-8">{children}</div>

        <p className="mt-8 text-sm text-stone">{alternate}</p>
      </div>
    </div>
  );
}
