"use client";

import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";

type Tab = {
  id: string;
  label: string;
  content: ReactNode;
};

type TabsProps = {
  tabs: Tab[];
  label: string;
  defaultId?: string;
  className?: string;
};

/** Arrow-key navigable tabs with roving focus, per the WAI-ARIA pattern. */
export function Tabs({ tabs, label, defaultId, className = "" }: TabsProps) {
  const [activeId, setActiveId] = useState(defaultId ?? tabs[0]?.id ?? "");
  const buttons = useRef<Record<string, HTMLButtonElement | null>>({});

  if (tabs.length === 0) return null;

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const forward = event.key === "ArrowRight" || event.key === "ArrowDown";
    const backward = event.key === "ArrowLeft" || event.key === "ArrowUp";
    if (!forward && !backward) return;

    event.preventDefault();
    const nextIndex = (index + (forward ? 1 : -1) + tabs.length) % tabs.length;
    const next = tabs[nextIndex];
    if (!next) return;

    setActiveId(next.id);
    buttons.current[next.id]?.focus();
  }

  return (
    <div className={className}>
      <div
        role="tablist"
        aria-label={label}
        className="flex gap-1 border-b border-line pb-px"
      >
        {tabs.map((tab, index) => {
          const selected = tab.id === activeId;
          return (
            <button
              key={tab.id}
              ref={(node) => {
                buttons.current[tab.id] = node;
              }}
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActiveId(tab.id)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={`relative -mb-px px-3 py-3 text-body-sm font-medium transition-colors ${
                selected
                  ? "border-b-2 border-ink text-ink"
                  : "border-b-2 border-transparent text-stone hover:text-ink"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`panel-${tab.id}`}
          aria-labelledby={`tab-${tab.id}`}
          hidden={tab.id !== activeId}
          tabIndex={0}
          className="pt-6 focus-visible:outline-none"
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
