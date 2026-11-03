"use client";

export default function Select({
  label,
  id,
  options = [],
  placeholder = "Select an option",
  error,
  className = "",
  ...props
}) {
  const selectId = id || props.name;

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label
          htmlFor={selectId}
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

      <select
        id={selectId}
        aria-invalid={Boolean(error)}
        className={[
          "min-h-10 w-full rounded-sm border bg-white px-3 py-2",
          "text-[13px] text-black outline-none",
          "focus:border-black",
          error ? "border-red-500" : "border-neutral-300",
          "disabled:cursor-not-allowed disabled:bg-neutral-100",
          className,
        ].join(" ")}
        {...props}
      >
        <option value="">{placeholder}</option>

        {options.map((option) => {
          const item =
            typeof option === "string"
              ? { label: option, value: option }
              : option;

          return (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          );
        })}
      </select>

      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}