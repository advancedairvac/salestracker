
"use client";

import { useState } from "react";
import SvgIcon from "@/components/icons/svg-icons";

export default function Input({
  as = "input",
  variant = "floating",
  label,
  id,
  name,
  type = "text",
  value,
  defaultValue,
  error,
  hint,
  required = false,
  className = "",
  wrapperClassName = "",
  floatLabel = false,
  rows = 2,
  children,
  placeholder,
  hideEmptyOption = false,
  onFocus,
  onBlur,
  ...props
}) {
  const [focused, setFocused] = useState(false);

  const inputId = id || name;

  const fieldValue = value ?? defaultValue;
  const hasValue =
    fieldValue !== null &&
    fieldValue !== undefined &&
    String(fieldValue) !== "";

  const floating =
    variant === "floating" &&
    (focused || hasValue || type === "date" || floatLabel);

  const describedBy = error
    ? `${inputId}-error`
    : hint
      ? `${inputId}-hint`
      : undefined;

  const controlClassName =
    variant === "plain"
      ? [
          "w-full rounded-none border border-[#d5d5d5] bg-white",
          as === "textarea"
            ? "resize-y px-3 py-3 leading-relaxed"
            : "min-h-[44px] px-3 py-3",
          "text-sm text-black outline-none transition-colors focus:border-black",
          "disabled:cursor-not-allowed disabled:opacity-60",
          as === "select" ? "appearance-none pr-10" : "",
          error ? "border-red-500" : "",
          className,
        ].join(" ")
      : [
          "peer w-full rounded-none border border-[#d9d9d9] bg-white",
          as === "textarea"
            ? "min-h-[58px] resize-y px-3 pt-[20px] pb-2"
            : "h-[50px] px-3 pt-[15px] pb-[4px]",
          "text-xs font-normal text-black lg:text-sm",
          "outline-none transition-colors focus:border-[#111111]",
          "disabled:cursor-not-allowed disabled:bg-[#f5f5f5]",
          as === "select" ? "appearance-none pr-10" : "",
          error ? "border-red-500" : "",
          className,
        ].join(" ");

  const controlProps = {
    ...props,
    id: inputId,
    name,
    required,
    onFocus: (event) => {
      setFocused(true);
      onFocus?.(event);
    },
    onBlur: (event) => {
      setFocused(false);
      onBlur?.(event);
    },
    "aria-invalid": Boolean(error),
    "aria-describedby": describedBy,
    className: controlClassName,
    ...(value !== undefined
      ? { value: value ?? "" }
      : defaultValue !== undefined
        ? { defaultValue }
        : {}),
  };

  let control;

  if (as === "textarea") {
    control = (
      <textarea
        {...controlProps}
        rows={rows}
        placeholder={variant === "plain" ? placeholder : " "}
      />
    );
  } else if (as === "select") {
    control = (
      <select {...controlProps}>
        {!hideEmptyOption && <option value="" disabled hidden />}
        {children}
      </select>
    );
  } else {
    control = (
      <input
        {...controlProps}
        type={type}
        placeholder={variant === "plain" ? placeholder : " "}
      />
    );
  }

  return (
    <div className={`relative w-full ${wrapperClassName}`}>
      {label && variant === "plain" && (
        <label
          htmlFor={inputId}
          className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#555]"
        >
          {label}
          {required && (
            <span className="ml-1 text-red-600" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      {control}

      {label && variant === "floating" && (
        <label
          htmlFor={inputId}
          className={[
            "pointer-events-none absolute left-3 z-[1]",
            "font-medium uppercase tracking-[0.02em]",
            "transition-all duration-150 ease-in-out",
            error ? "text-red-600" : "text-[#565656]",
            floating
              ? "top-[6px] text-[10px]"
              : as === "textarea"
                ? "top-[16px] text-xs"
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

      {as === "select" && (
        <SvgIcon
          name="chevronDown"
          className={`pointer-events-none absolute right-3 ${
            variant === "plain" && label ? "top-[38px]" : "top-1/2 -translate-y-1/2"
          } h-4 w-4 shrink-0 transition-transform duration-200 ease-in-out ${
            focused ? "rotate-180" : ""
          }`}
        />
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
          className="mt-1 text-xs leading-5 text-neutral-500"
        >
          {hint}
        </p>
      )}
    </div>
  );
}
