"use client";

import { useEffect, useRef, useState } from "react";
import SvgIcon from "@/components/icons/svg-icons";

const PRESETS = [
  "Custom",
  "Today",
  "Yesterday",
  "Last 7 Days",
  "Last 30 Days",
  "Last 365 Days",
  "MTD",
  "QTD",
  "YTD",
  "Q1",
  "Q2",
  "Q3",
  "Q4",
];

function toInputDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(dateString) {
  if (!dateString) return "";

  const [year, month, day] = dateString.split("-").map(Number);

  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getDateRange(preset) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const year = today.getFullYear();
  const month = today.getMonth();
  const day = today.getDate();

  let start;
  let end = new Date(today);

  switch (preset) {
    case "Today":
      start = new Date(today);
      break;

    case "Yesterday":
      start = new Date(today);
      start.setDate(day - 1);
      end = new Date(start);
      break;

    case "Last 7 Days":
      start = new Date(today);
      start.setDate(day - 6);
      break;

    case "Last 30 Days":
      start = new Date(today);
      start.setDate(day - 29);
      break;

    case "Last 365 Days":
      start = new Date(today);
      start.setDate(day - 364);
      break;

    case "MTD":
      start = new Date(year, month, 1);
      break;

    case "QTD": {
      const quarterStartMonth = Math.floor(month / 3) * 3;
      start = new Date(year, quarterStartMonth, 1);
      break;
    }

    case "YTD":
      start = new Date(year, 0, 1);
      break;

    case "Q1":
      start = new Date(year, 0, 1);
      end = new Date(year, 2, 31);
      break;

    case "Q2":
      start = new Date(year, 3, 1);
      end = new Date(year, 5, 30);
      break;

    case "Q3":
      start = new Date(year, 6, 1);
      end = new Date(year, 8, 30);
      break;

    case "Q4":
      start = new Date(year, 9, 1);
      end = new Date(year, 11, 31);
      break;

    default:
      start = new Date(year, month, 1);
      end = new Date(year, month + 1, 0);
  }

  return {
    startDate: toInputDate(start),
    endDate: toInputDate(end),
  };
}

export default function DateSelector({
  value,
  onChange,
  className = "",
  disabled = false,
}) {
  const initialRange = getDateRange("MTD");

  const [internalValue, setInternalValue] = useState(
    () => value || initialRange,
  );

  const [isOpen, setIsOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState("MTD");
  const [customMode, setCustomMode] = useState(false);

  const [draft, setDraft] = useState(() => value || initialRange);

  const containerRef = useRef(null);

  const selectedRange = value || internalValue;

  // Sync external date range
  useEffect(() => {
    if (!value) return;

    setInternalValue(value);
    setDraft(value);
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleOutsideClick(event) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
        setCustomMode(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  // Close dropdown with Escape key
  useEffect(() => {
    function handleEscape(event) {
      if (event.key === "Escape") {
        setIsOpen(false);
        setCustomMode(false);
      }
    }

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  // Apply selected date range
  function applyRange(range, preset) {
    setInternalValue(range);
    setDraft(range);
    setSelectedPreset(preset);
    setCustomMode(false);
    setIsOpen(false);

    onChange?.(range);
  }

  // Handle preset selection
  function handlePresetClick(preset) {
    if (preset === "Custom") {
      setSelectedPreset("Custom");
      setCustomMode(true);
      setDraft({ ...selectedRange });
      return;
    }

    applyRange(getDateRange(preset), preset);
  }

  // Apply custom date range
  function handleCustomApply() {
    if (!draft.startDate || !draft.endDate || draft.startDate > draft.endDate) {
      return;
    }

    applyRange(draft, "Custom");
  }

  // Toggle dropdown
  function handleToggle() {
    if (disabled) return;

    if (!isOpen) {
      setDraft({ ...selectedRange });
    }

    setIsOpen((previous) => !previous);
    setCustomMode(false);
  }

  return (
    <div ref={containerRef} className={`relative z-30 w-full ${className}`}>
      {/* Date Selector Trigger */}
      <div className="relative border border-[#d5d5d5] bg-white">
        <button
          type="button"
          disabled={disabled}
          onClick={handleToggle}
          aria-expanded={isOpen}
          aria-haspopup="true"
          aria-label="Select date range"
          className="flex min-h-[76px] w-full items-center gap-5 px-5 text-left transition-colors hover:bg-[#fafafa] disabled:cursor-not-allowed disabled:opacity-50 sm:px-6"
        >
          <SvgIcon
            name="calendar"
            className="h-10 w-10 shrink-0 text-[#565656]"
          />

          <span className="min-w-0 flex-1 text-sm font-medium text-[#555] sm:text-base">
            {formatDate(selectedRange.startDate)} -{" "}
            {formatDate(selectedRange.endDate)}
          </span>

          <SvgIcon
            name="chevronDown"
            className={`h-6 w-6 shrink-0 text-[#555] transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>

      {/* Floating Dropdown Overlay */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 border border-t-0 border-[#d5d5d5] bg-white shadow-md">
          <div className="max-h-[min(65vh,560px)] overflow-y-auto overscroll-contain px-5 pb-4 pt-1 sm:px-6">
            {!customMode ? (
              /* Preset Options */
              <div className="flex flex-col">
                {PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handlePresetClick(preset)}
                    className={`min-h-[40px] w-fit text-left text-sm font-medium text-[#555] transition-colors hover:text-black sm:text-base ${
                      selectedPreset === preset
                        ? "font-semibold text-black"
                        : ""
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            ) : (
              /* Custom Date Range */
              <div className="space-y-4 py-4">
                <h3 className="text-sm font-bold uppercase tracking-wide text-black">
                  Custom Date Range
                </h3>

                {/* Start Date */}
                <div>
                  <label
                    htmlFor="date-start"
                    className="mb-2 block text-xs font-medium text-[#555]"
                  >
                    Start Date
                  </label>

                  <input
                    id="date-start"
                    type="date"
                    value={draft.startDate}
                    max={draft.endDate || undefined}
                    onChange={(event) =>
                      setDraft((previous) => ({
                        ...previous,
                        startDate: event.target.value,
                      }))
                    }
                    className="h-11 w-full border border-[#d5d5d5] px-3 text-sm outline-none focus:border-black"
                  />
                </div>

                {/* End Date */}
                <div>
                  <label
                    htmlFor="date-end"
                    className="mb-2 block text-xs font-medium text-[#555]"
                  >
                    End Date
                  </label>

                  <input
                    id="date-end"
                    type="date"
                    value={draft.endDate}
                    min={draft.startDate || undefined}
                    onChange={(event) =>
                      setDraft((previous) => ({
                        ...previous,
                        endDate: event.target.value,
                      }))
                    }
                    className="h-11 w-full border border-[#d5d5d5] px-3 text-sm outline-none focus:border-black"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-2 border-t border-[#e5e5e5] pt-3">
                  <button
                    type="button"
                    onClick={() => setCustomMode(false)}
                    className="h-10 flex-1 border border-[#d5d5d5] text-sm font-medium text-[#555] transition-colors hover:bg-[#f5f5f5]"
                  >
                    Back
                  </button>

                  <button
                    type="button"
                    onClick={handleCustomApply}
                    disabled={
                      !draft.startDate ||
                      !draft.endDate ||
                      draft.startDate > draft.endDate
                    }
                    className="h-10 flex-1 bg-black text-sm font-semibold text-white transition-colors hover:bg-[#333] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
