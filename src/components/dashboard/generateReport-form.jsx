"use client";

import { useState } from "react";

import DateSelector from "@/components/ui/date-selector";
import SvgIcon from "@/components/icons/svg-icons";

// ============================================
// REPORT TYPES
// ============================================

const REPORT_TYPES = [
  { value: "SALES", label: "SALES" },
  { value: "OPPORTUNITIES", label: "OPPORTUNITIES" },
  { value: "ESTIMATES", label: "ESTIMATES" },
  { value: "COMMISSIONS", label: "COMMISSIONS" },
  { value: "ALL", label: "ALL" },
];

// ============================================
// SHARED FORM STYLES
// ============================================

const selectClass = [
  "peer h-[50px] w-full appearance-none rounded-none",
  "border border-[#d9d9d9] bg-white",
  "px-3 pt-[15px] pb-[4px] pr-10",
  "text-xs font-normal outline-none transition-colors",
  "focus:border-[#111111]",
].join(" ");

const labelBase = [
  "pointer-events-none absolute left-3 z-[1]",
  "font-medium uppercase tracking-[0.02em]",
  "text-[#565656] transition-all duration-150",
].join(" ");

// ============================================
// FLOATING SELECT
// ============================================

function FloatingSelect({
  name,
  label,
  value = "",
  onChange,
  options = [],
  required = false,
}) {
  const [focused, setFocused] = useState(false);

  const floating = focused || value !== "";

  return (
    <div className="relative w-full">
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        required={required}
        className={[
          selectClass,
          floating ? "text-[#111111]" : "text-transparent",
        ].join(" ")}
      >
        <option value="" disabled hidden />

        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <label
        htmlFor={name}
        className={`${labelBase} ${
          floating
            ? "top-[6px] text-[10px]"
            : "top-1/2 -translate-y-1/2 text-[10px]"
        }`}
      >
        {label}

        {required && (
          <span className="ml-1 text-red-600" aria-hidden="true">
            *
          </span>
        )}
      </label>

      <SvgIcon
        name="chevronDown"
        className={[
          "pointer-events-none absolute right-3 top-1/2",
          "h-4 w-4 -translate-y-1/2 shrink-0",
          "text-[#555555]",
        ].join(" ")}
      />
    </div>
  );
}

// ============================================
// GENERATE REPORT FORM
// ============================================

export default function GenerateReportForm({ users = [] }) {
  const [dateRange, setDateRange] = useState(null);
  const [reportType, setReportType] = useState("");
  const [salesmanId, setSalesmanId] = useState("ALL");
  const [message, setMessage] = useState("");

  // ============================================
  // SALESMAN OPTIONS
  // ============================================

  const salesmanOptions = [
    {
      value: "ALL",
      label: "ALL SALESMEN",
    },
    ...users.map((user) => ({
      value: user.id,
      label: `${user.name}${user.role === "ADMIN" ? " (ADMIN)" : ""}`,
    })),
  ];

  // ============================================
  // HANDLE SUBMIT
  // ============================================

  function handleSubmit(event) {
    event.preventDefault();

    setMessage("");

    if (!dateRange?.startDate || !dateRange?.endDate) {
      setMessage("Please select a date range.");
      return;
    }

    if (!reportType) {
      setMessage("Please select a report type.");
      return;
    }

    if (!salesmanId) {
      setMessage("Please select a salesman.");
      return;
    }

    setMessage(
      "Your report filters are ready. Report output will be available after confirmation.",
    );
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <section className="w-full max-w-[700px]">
      <form onSubmit={handleSubmit} className="flex w-full flex-col gap-[9px]">
        {/* Date Range */}

        <DateSelector
          value={dateRange || undefined}
          onChange={(range) => {
            setDateRange(range);
            setMessage("");
          }}
          compact
        />

        {/* Report Type */}

        <FloatingSelect
          name="type"
          label="TYPE"
          value={reportType}
          onChange={(event) => {
            setReportType(event.target.value);
            setMessage("");
          }}
          options={REPORT_TYPES}
          required
        />

        {/* Salesman */}

        <FloatingSelect
          name="salesmanId"
          label="SALESMAN"
          value={salesmanId}
          onChange={(event) => {
            setSalesmanId(event.target.value);
            setMessage("");
          }}
          options={salesmanOptions}
        />

        {/* Selected Date Range */}

        <input
          type="hidden"
          name="startDate"
          value={dateRange?.startDate || ""}
        />

        <input type="hidden" name="endDate" value={dateRange?.endDate || ""} />

        {/* Generate Button */}

        <button
          type="submit"
          className={[
            "mt-0 flex h-[48px] w-full items-center justify-center",
            "rounded-none border border-[#111111]",
            "bg-[#111111] px-4",
            "text-xs font-semibold uppercase tracking-[0.03em] text-white",
            "transition-colors hover:bg-[#333333]",
            "focus-visible:outline-none focus-visible:ring-2",
            "focus-visible:ring-black focus-visible:ring-offset-2",
          ].join(" ")}
        >
          Generate
        </button>

        {/* Temporary Confirmation */}

        {message && (
          <p
            role="status"
            className={[
              "border border-[#d5d5d5]",
              "bg-[#fafafa] px-3 py-3",
              "text-xs leading-5 text-[#555555]",
            ].join(" ")}
          >
            {message}
          </p>
        )}
      </form>
    </section>
  );
}
