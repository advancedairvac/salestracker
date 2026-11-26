
"use client";

import { useState } from "react";

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseDate(dateString) {
  if (!dateString) return null;

  const [year, month, day] = dateString.split("-").map(Number);

  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day);
}

function getMonthName(date) {
  return date.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function getMonthDays(monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const startDay = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  return [
    ...Array.from({ length: startDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => {
      return new Date(year, month, index + 1);
    }),
  ];
}

function formatDateInput(dateString) {
  if (!dateString) return "";

  const date = parseDate(dateString);
  if (!date) return "";

  return toDateKey(date);
}

export default function CustomDateCalendar({
  startDate = "",
  endDate = "",
  onDateSelect,
  onApply,
  onCancel,
}) {
  // TODAY
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayKey = toDateKey(today);

  // INITIAL MONTH
  const initialMonth = parseDate(endDate) || parseDate(startDate) || today;

  const [currentMonth, setCurrentMonth] = useState(
    new Date(initialMonth.getFullYear(), initialMonth.getMonth(), 1),
  );

  // CURRENT MONTH LIMIT
  const maxMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  // LEFT MONTH
  const previousMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() - 1,
    1,
  );

  // RIGHT MONTH
  const months = [previousMonth, currentMonth];

  // MONTH NAVIGATION
  function changeMonth(direction) {
    const nextMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + direction,
      1,
    );

    // Prevent navigating into future months
    if (nextMonth > maxMonth) return;

    setCurrentMonth(nextMonth);
  }

  // DATE SELECTION
  function handleDateClick(date) {
    if (!date) return;

    const dateKey = toDateKey(date);

    // Prevent future date selection
    if (dateKey > todayKey) return;

    if (
      !startDate ||
      (startDate && endDate) ||
      dateKey < startDate
    ) {
      onDateSelect?.({
        startDate: dateKey,
        endDate: "",
      });

      return;
    }

    onDateSelect?.({
      startDate,
      endDate: dateKey,
    });
  }

  // MANUAL START DATE CHANGE
  function handleStartDateChange(value) {
    if (!value || value > todayKey) return;

    let nextEndDate = endDate;

    if (nextEndDate && value > nextEndDate) {
      nextEndDate = "";
    }

    onDateSelect?.({
      startDate: value,
      endDate: nextEndDate,
    });

    const selectedDate = parseDate(value);

    if (selectedDate) {
      const selectedMonth = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        1,
      );

      setCurrentMonth(selectedMonth);
    }
  }

  // MANUAL END DATE CHANGE
  function handleEndDateChange(value) {
    if (!value || value > todayKey) return;
    if (startDate && value < startDate) return;

    onDateSelect?.({
      startDate,
      endDate: value,
    });

    const selectedDate = parseDate(value);

    if (selectedDate) {
      const selectedMonth = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        1,
      );

      setCurrentMonth(selectedMonth);
    }
  }

  // RENDER MONTH
  function renderMonth(monthDate, monthIndex) {
    const days = getMonthDays(monthDate);

    return (
      <div
        key={`${monthDate.getFullYear()}-${monthDate.getMonth()}`}
        className={[
          "min-w-0 flex-1",
          monthIndex === 1
            ? "border-l border-[#e5e5e5] pl-4 sm:pl-6"
            : "pr-4 sm:pr-6",
        ].join(" ")}
      >
        {/* WEEK DAYS */}
        <div className="mb-2 grid grid-cols-7">
          {WEEK_DAYS.map((day) => (
            <div
              key={day}
              className="py-2 text-center text-[10px] text-[#777] sm:text-xs"
            >
              {day}
            </div>
          ))}
        </div>

        {/* MONTH DATES */}
        <div className="grid grid-cols-7">
          {days.map((date, index) => {
            if (!date) {
              return (
                <div
                  key={`empty-${monthIndex}-${index}`}
                  className="h-9"
                />
              );
            }

            const dateKey = toDateKey(date);
            const isFuture = dateKey > todayKey;

            const isStart = dateKey === startDate;
            const isEnd = dateKey === endDate;

            const isInRange =
              startDate &&
              endDate &&
              dateKey > startDate &&
              dateKey < endDate;

            const isSelected = isStart || isEnd;

            return (
              <div
                key={dateKey}
                className={[
                  "relative flex h-9 items-center justify-center",
                  isInRange ? "bg-[#eeeeee]" : "",
                ].join(" ")}
              >
                <button
                  type="button"
                  disabled={isFuture}
                  onClick={() => handleDateClick(date)}
                  aria-label={date.toDateString()}
                  className={[
                    "flex h-8 w-8 items-center justify-center",
                    "text-xs transition-colors",
                    isSelected
                      ? "bg-[#222] text-white"
                      : isFuture
                        ? "text-[#d4d4d4]"
                        : "text-[#222] hover:bg-[#eeeeee]",
                    isFuture
                      ? "cursor-not-allowed"
                      : "cursor-pointer",
                  ].join(" ")}
                >
                  {date.getDate()}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // RENDER
  return (
    <div className="w-full bg-white pt-3">
      {/* MANUAL DATE INPUTS */}
      <div className="mb-5 flex items-center gap-2">
        <input
          type="date"
          value={formatDateInput(startDate)}
          max={todayKey}
          onChange={(event) =>
            handleStartDateChange(event.target.value)
          }
          className="h-11 min-w-0 flex-1 border border-[#d5d5d5] bg-white px-3 text-sm text-[#555] outline-none focus:border-black"
        />

        <span className="shrink-0 text-sm text-[#777]">→</span>

        <input
          type="date"
          value={formatDateInput(endDate)}
          min={startDate || undefined}
          max={todayKey}
          onChange={(event) =>
            handleEndDateChange(event.target.value)
          }
          className="h-11 min-w-0 flex-1 border border-[#d5d5d5] bg-white px-3 text-sm text-[#555] outline-none focus:border-black"
        />
      </div>

      {/* MONTH HEADER + NAVIGATION */}
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => changeMonth(-1)}
          aria-label="Previous month"
          className="flex h-8 w-8 items-center justify-center bg-black pb-[4px] text-white transition hover:bg-[#333]"
        >
          <span className="text-xl leading-none">‹</span>
        </button>

        <div className="grid flex-1 grid-cols-2">
          {months.map((month, index) => (
            <div
              key={`${month.getFullYear()}-${month.getMonth()}`}
              className={[
                "text-center text-sm font-semibold text-black",
                index === 1 ? "border-l border-[#e5e5e5]" : "",
              ].join(" ")}
            >
              {getMonthName(month)}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => changeMonth(1)}
          disabled={currentMonth >= maxMonth}
          aria-label="Next month"
          className="flex h-8 w-8 items-center justify-center bg-black pb-[4px] text-white transition hover:bg-[#333] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span className="text-xl leading-none">›</span>
        </button>
      </div>

      {/* TWO MONTH CALENDAR */}
      <div className="grid grid-cols-2">
        {months.map((month, index) => renderMonth(month, index))}
      </div>

      {/* ACTIONS */}
      <div className="mt-4 flex items-center justify-end gap-2 border-t border-[#e5e5e5] pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="bg-[#eeeeee] px-5 py-2 text-xs font-medium text-[#222] transition hover:bg-[#e5e5e5"
        >
          Cancel
        </button>

        <button
          type="button"
          disabled={
            !startDate ||
            !endDate ||
            startDate > endDate ||
            endDate > todayKey
          }
          onClick={onApply}
          className="bg-[#222] px-5 py-2 text-xs font-medium text-white transition hover:bg-[#333] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Apply
        </button>
      </div>
    </div>
  );
}
