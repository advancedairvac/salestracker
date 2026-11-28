"use client";

import { useEffect, useRef, useState } from "react";
import SvgIcon from "@/components/icons/svg-icons";

import CustomDateCalendar from "@/components/ui/custom-date-calendar";

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
  fullWidth = false,
}) {
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
  // APPLY RANGE
  // ------------------------------------------

  function applyRange(range, selectedPresetValue) {
    setInternalValue(range);
    setDraft(range);
    setSelectedPreset(selectedPresetValue);

    setCustomMode(false);
    setIsOpen(false);

    onChange?.(range, selectedPresetValue);
  }

  // ------------------------------------------
  // PRESET CLICK
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
  // CUSTOM DATE SELECTION
  // ------------------------------------------

  function handleCustomDateSelect(range) {
    setDraft(range);
  }

  function handleCustomApply() {
    if (
      !draft.startDate ||
      !draft.endDate ||
      draft.startDate > draft.endDate
    ) {
      return;
    }

    applyRange(draft, "Custom");
  }

  function handleCustomCancel() {
    setCustomMode(false);
    setSelectedPreset(
      PRESETS.includes(preset) ? preset : "MTD",
    );
    setDraft({ ...selectedRange });
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

  // ------------------------------------------
  // STYLES
  // ------------------------------------------

  const triggerClass = compact
    ? "min-h-[44px] gap-3 px-3"
    : "min-h-[72px] gap-5 px-5 sm:px-6";

  const calendarClass = compact ? "h-5 w-5" : "h-10 w-10";

  const dateTextClass = compact ? "text-xs" : "text-sm sm:text-base";

  const chevronClass = compact ? "h-4 w-4" : "h-6 w-6";

  // ============================================
  // RENDER
  // ============================================

  return (
    <div
      ref={containerRef}
      className={`relative z-30 w-full ${
        fullWidth ? "" : "lg:w-1/2 lg:pr-1.5"
      } ${className}`}
    >
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
            className={`shrink-0 h-[30px] w-[30px] text-[#565656] ${calendarClass}`}
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
              "transition-transform duration-200 ease-in-out",
              chevronClass,
              isOpen ? "rotate-180" : "",
            ].join(" ")}
          />
        </button>
      </div>

      {/* DROPDOWN */}

      {isOpen && (
        <div
          className={`absolute left-0 right-0 top-full z-50 border border-t-0 border-[#d5d5d5] bg-white shadow-md ${
            fullWidth ? "" : "mr-[6px]"
          }`}
        >
          <div className="max-h-[min(75vh,700px)] overflow-y-auto overscroll-contain px-5 pb-4 pt-1 sm:px-6">
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
              <CustomDateCalendar
                startDate={draft.startDate || ""}
                endDate={draft.endDate || ""}
                onDateSelect={handleCustomDateSelect}
                onApply={handleCustomApply}
                onCancel={handleCustomCancel}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
