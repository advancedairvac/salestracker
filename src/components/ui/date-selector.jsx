"use client";

import { useEffect, useRef, useState } from "react";
import SvgIcon from "@/components/icons/svg-icons";

import {
  PRESETS,
  formatDate,
  getDateRange,
  getInitialRange,
} from "@/lib/date/date-utils";

// ============================================
// DATE SELECTOR
// ============================================

export default function DateSelector({
  value,
  preset = "MTD",
  onChange,
  className = "",
  disabled = false,
  compact = false,
}) {
  // ------------------------------------------
  // INITIAL STATE
  // ------------------------------------------

  const initialRange = getInitialRange();

  const [internalValue, setInternalValue] = useState(
    () => value || initialRange,
  );

  const [draft, setDraft] = useState(() => value || initialRange);

  const [isOpen, setIsOpen] = useState(false);

  const [selectedPreset, setSelectedPreset] = useState(() =>
    PRESETS.includes(preset) ? preset : "MTD",
  );

  const [customMode, setCustomMode] = useState(false);

  const containerRef = useRef(null);

  // ------------------------------------------
  // SELECTED VALUES
  // ------------------------------------------

  const selectedRange = value || internalValue;

  // ------------------------------------------
  // SYNC EXTERNAL VALUES
  // ------------------------------------------

  useEffect(() => {
    if (value) {
      setInternalValue(value);
      setDraft(value);
    }
  }, [value]);

  useEffect(() => {
    setSelectedPreset(PRESETS.includes(preset) ? preset : "MTD");
  }, [preset]);

  // ------------------------------------------
  // APPLY DATE RANGE
  // ------------------------------------------

  function applyRange(range, selectedPresetValue) {
    setInternalValue(range);
    setDraft(range);

    setSelectedPreset(selectedPresetValue);

    setCustomMode(false);
    setIsOpen(false);

    // Send both date range and selected preset.
    onChange?.(range, selectedPresetValue);
  }

  // ------------------------------------------
  // HANDLE PRESET SELECTION
  // ------------------------------------------

  function handlePresetClick(presetValue) {
    if (presetValue === "Custom") {
      setSelectedPreset("Custom");
      setCustomMode(true);

      setDraft({ ...selectedRange });

      return;
    }

    const range = getDateRange(presetValue);

    applyRange(range, presetValue);
  }

  // ------------------------------------------
  // HANDLE CUSTOM RANGE
  // ------------------------------------------

  function handleCustomApply() {
    if (!draft.startDate || !draft.endDate || draft.startDate > draft.endDate) {
      return;
    }

    applyRange(draft, "Custom");
  }

  // ------------------------------------------
  // TOGGLE DROPDOWN
  // ------------------------------------------

  function handleToggle() {
    if (disabled) return;

    if (!isOpen) {
      setDraft({ ...selectedRange });
    }

    setIsOpen((previous) => !previous);
    setCustomMode(false);
  }

  // ------------------------------------------
  // CLOSE ON OUTSIDE CLICK
  // ------------------------------------------

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

  // ------------------------------------------
  // CLOSE ON ESCAPE
  // ------------------------------------------

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

  // ============================================
  // STYLES
  // ============================================

  const triggerClass = compact
    ? "min-h-[44px] gap-3 px-3"
    : "min-h-[76px] gap-5 px-5 sm:px-6";

  const calendarClass = compact ? "h-5 w-5" : "h-10 w-10";

  const dateTextClass = compact ? "text-xs" : "text-sm sm:text-base";

  const chevronClass = compact ? "h-4 w-4" : "h-6 w-6";

  // ============================================
  // RENDER
  // ============================================

  return (
    <div ref={containerRef} className={`relative z-30 w-full ${className}`}>
      {/* DATE SELECTOR TRIGGER */}

      <div className="relative border border-[#d5d5d5] bg-white">
        <button
          type="button"
          disabled={disabled}
          onClick={handleToggle}
          aria-expanded={isOpen}
          aria-haspopup="true"
          aria-label="Select date range"
          className={[
            "flex w-full items-center text-left",
            "transition-colors hover:bg-[#fafafa]",
            "disabled:cursor-not-allowed disabled:opacity-50",
            triggerClass,
          ].join(" ")}
        >
          <SvgIcon
            name="calendar"
            className={`shrink-0 text-[#565656] ${calendarClass}`}
          />

          <span
            className={`min-w-0 flex-1 font-medium text-[#555] ${dateTextClass}`}
          >
            {formatDate(selectedRange.startDate)} -{" "}
            {formatDate(selectedRange.endDate)}
          </span>

          <SvgIcon
            name="chevronDown"
            className={[
              "shrink-0 text-[#555]",
              "transition-transform duration-200",
              chevronClass,
              isOpen ? "rotate-180" : "",
            ].join(" ")}
          />
        </button>
      </div>

      {/* DROPDOWN */}

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 border border-t-0 border-[#d5d5d5] bg-white shadow-md">
          <div className="max-h-[min(65vh,560px)] overflow-y-auto overscroll-contain px-5 pb-4 pt-1 sm:px-6">
            {!customMode ? (
              <div className="flex flex-col">
                {PRESETS.map((presetValue) => (
                  <button
                    key={presetValue}
                    type="button"
                    onClick={() => handlePresetClick(presetValue)}
                    className={[
                      "min-h-[40px] w-fit text-left",
                      "text-sm font-medium text-[#555]",
                      "transition-colors hover:text-black",
                      "sm:text-base",
                      selectedPreset === presetValue
                        ? "font-semibold text-black"
                        : "",
                    ].join(" ")}
                  >
                    {presetValue}
                  </button>
                ))}
              </div>
            ) : (
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
                    className={[
                      "h-11 w-full border border-[#d5d5d5]",
                      "px-3 text-sm outline-none",
                      "focus:border-black",
                    ].join(" ")}
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
                    className={[
                      "h-11 w-full border border-[#d5d5d5]",
                      "px-3 text-sm outline-none",
                      "focus:border-black",
                    ].join(" ")}
                  />
                </div>

                {/* Custom Actions */}

                <div className="flex gap-2 border-t border-[#e5e5e5] pt-3">
                  <button
                    type="button"
                    onClick={() => setCustomMode(false)}
                    className={[
                      "h-10 flex-1 border border-[#d5d5d5]",
                      "text-sm font-medium text-[#555]",
                      "transition-colors hover:bg-[#f5f5f5]",
                    ].join(" ")}
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
                    className={[
                      "h-10 flex-1 bg-black",
                      "text-sm font-semibold text-white",
                      "transition-colors hover:bg-[#333]",
                      "disabled:cursor-not-allowed disabled:opacity-40",
                    ].join(" ")}
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
