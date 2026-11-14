"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { CloseIcon } from "./icons";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
};

/**
 * Native <dialog> keeps focus trapping, Escape handling and the backdrop in the
 * platform instead of a custom focus loop.
 */
export function Modal({ open, onClose, title, description, children, footer }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      aria-labelledby="modal-title"
      aria-describedby={description ? "modal-description" : undefined}
      className="m-auto w-[min(92vw,34rem)] rounded-sheet border border-line bg-paper p-0 text-ink shadow-lift backdrop:bg-ink/40"
    >
      <div className="flex items-start justify-between gap-4 px-6 pt-6">
        <div>
          <h2 id="modal-title" className="text-title font-medium">
            {title}
          </h2>
          {description ? (
            <p id="modal-description" className="mt-2 text-body-sm text-stone">
              {description}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="-mr-1 -mt-1 inline-flex h-9 w-9 items-center justify-center rounded-full text-stone transition hover:bg-mist hover:text-ink"
        >
          <span className="sr-only">Close</span>
          <CloseIcon />
        </button>
      </div>

      {children ? <div className="px-6 py-5">{children}</div> : null}

      {footer ? <div className="flex justify-end gap-2 px-6 pb-6">{footer}</div> : null}
    </dialog>
  );
}
