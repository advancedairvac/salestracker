
"use client";

export default function Input({
  label,
  id,
  error,
  hint,
  className = "",
  ...props
}) {
  const inputId = id || props.name;

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold text-neutral-800"
        >
          {label}
          {props.required && (
            <span className="ml-1 text-red-600" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      <input
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={
          error
            ? `${inputId}-error`
            : hint
              ? `${inputId}-hint`
              : undefined
        }
        className={[
          // Default input styling
          "min-h-[42px] w-full rounded-none border border-black",
          "bg-white px-3 py-2 text-sm text-black",
          "placeholder:text-black",

          // Focus styling
          "outline-none focus:outline-none focus:ring-0",
          "focus:border-black",

          // Autofill styling
          "[&:-webkit-autofill]:[-webkit-text-fill-color:#000]",
          "[&:-webkit-autofill]:[transition:background-color_999999s_ease-in-out_0s]",

          // Error and disabled states
          error ? "border-red-500" : "",
          "disabled:cursor-not-allowed disabled:bg-neutral-100",

          // Optional custom classes
          className,
        ].join(" ")}
        {...props}
      />

      {error && (
        <p
          id={`${inputId}-error`}
          role="alert"
          className="text-xs text-red-600"
        >
          {error}
        </p>
      )}

      {!error && hint && (
        <p id={`${inputId}-hint`} className="text-xs text-neutral-500">
          {hint}
        </p>
      )}
    </div>
  );
}
