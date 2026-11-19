
"use client";

import { useState } from "react";

// ============================================
// ERROR NOTIFICATION
// Reusable notification component
// ============================================

export default function ErrorNotification({
  title = "Something went wrong",
  message = "An unexpected error occurred.",
  type = "error",
  dismissible = true,
  onDismiss,
  className = "",
}) {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  const styles = {
    error: {
      container: "border-red-200 bg-white",
      icon: "bg-red-50 text-red-600",
      title: "text-red-900",
    },
    warning: {
      container: "border-amber-200 bg-white",
      icon: "bg-amber-50 text-amber-600",
      title: "text-amber-900",
    },
    info: {
      container: "border-blue-200 bg-white",
      icon: "bg-blue-50 text-blue-600",
      title: "text-blue-900",
    },
  };

  const currentStyle = styles[type] || styles.error;

  const handleDismiss = () => {
    setVisible(false);
    onDismiss?.();
  };

  return (
    <div
      role="alert"
      className={`fixed bottom-5 right-5 z-[100] flex w-[calc(100%-40px)] max-w-sm items-start gap-3 rounded-xl border p-4 shadow-lg ${currentStyle.container} ${className}`}
    >
      {/* ICON */}

      <div
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${currentStyle.icon}`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="h-5 w-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v4m0 4h.01M10.3 3.9 1.8 18.2A2 2 0 0 0 3.5 21h17a2 2 0 0 0 1.7-2.8L13.7 3.9a2 2 0 0 0-3.4 0Z"
          />
        </svg>
      </div>

      {/* CONTENT */}

      <div className="min-w-0 flex-1">
        <p className={`text-sm font-semibold ${currentStyle.title}`}>
          {title}
        </p>

        <p className="mt-1 text-xs leading-5 text-neutral-600">
          {message}
        </p>
      </div>

      {/* DISMISS BUTTON */}

      {dismissible && (
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss notification"
          className="shrink-0 rounded-md p-1 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-4 w-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m18 6-12 12M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
