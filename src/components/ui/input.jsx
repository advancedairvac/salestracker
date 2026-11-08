
"use client";

import { useState } from "react";

export default function Input({
  label,
  id,
  name,
  type = "text",
  value = "",
  error,
  hint,
  required = false,
  className = "",
  wrapperClassName = "",
  onFocus,
  onBlur,
  ...props
}) {
  const [focused, setFocused] = useState(false);

  const inputId = id || name;

  const hasValue =
    value !== null &&
    value !== undefined &&
    String(value) !== "";

  // Date inputs always keep their label at the top.
  const floating = focused || hasValue || type === "date";

  const describedBy = error
    ? `${inputId}-error`
    : hint
      ? `${inputId}-hint`
      : undefined;

  return (
    <div className={`relative w-full ${wrapperClassName}`}>
      <input
        {...props}
        id={inputId}
        name={name}
        type={type}
        value={value ?? ""}
        required={required}
        placeholder=" "
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className={[
          "peer h-[50px] w-full rounded-none",
          "border border-[#d9d9d9] bg-white",
          "px-3 pt-[15px] pb-[4px]",
          "text-xs font-normal text-black lg:text-sm",
          "outline-none transition-colors",
          "focus:border-[#111111]",
          "disabled:cursor-not-allowed disabled:bg-[#f5f5f5]",
          error ? "border-red-500" : "",
          className,
        ].join(" ")}
      />

      {label && (
        <label
          htmlFor={inputId}
          className={[
            "pointer-events-none absolute left-3 z-[1]",
            "font-medium uppercase tracking-[0.02em]",
            "transition-all duration-150",
            error ? "text-red-600" : "text-[#565656]",
            floating
              ? "top-[6px] text-[10px]"
              : "top-1/2 -translate-y-1/2 text-xs",
          ].join(" ")}
        >
          {label}

          {required && (
            <span className="ml-1 text-red-600" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      {error && (
        <p
          id={`${inputId}-error`}
          role="alert"
          className="mt-1 text-xs text-red-600"
        >
          {error}
        </p>
      )}

      {!error && hint && (
        <p
          id={`${inputId}-hint`}
          className="mt-1 text-xs text-neutral-500"
        >
          {hint}
        </p>
      )}
    </div>
  );
}
