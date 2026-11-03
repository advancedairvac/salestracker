
"use client";

import { useEffect } from "react";

export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = "md",
}) {
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose?.();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const widths = {
    sm: "max-w-sm",
    md: "max-w-lg",
    lg: "max-w-2xl",
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close dialog"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/40"
      />

      {/* Modal panel */}
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby={description ? "modal-description" : undefined}
        className={[
          "relative z-10 max-h-[90vh] w-full overflow-y-auto",
          "border border-neutral-200 bg-white shadow-xl",
          widths[size] || widths.md,
        ].join(" ")}
      >
        <div className="flex items-start justify-between gap-4 border-b border-neutral-200 px-5 py-4">
          <div>
            <h2 id="modal-title" className="text-base font-bold">
              {title}
            </h2>

            {description && (
              <p
                id="modal-description"
                className="mt-1 text-sm leading-5 text-neutral-500"
              >
                {description}
              </p>
            )}
          </div>

          <button
            type="button"
            aria-label="Close dialog"
            onClick={onClose}
            className="flex size-8 shrink-0 items-center justify-center text-2xl leading-none text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-black"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <div className="p-5">{children}</div>
      </section>
    </div>
  );
}
