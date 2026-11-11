// ============================================
// DATE PRESETS
// ============================================

export const PRESETS = [
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

// ============================================
// DATE HELPERS
// ============================================

export function toInputDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// ============================================
// VALIDATE DATE STRING
// ============================================

export function isValidDateString(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return (
    !Number.isNaN(date.getTime()) &&
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

// ============================================
// FORMAT DATE
// ============================================

export function formatDate(dateString) {
  if (!dateString) return "";

  const [year, month, day] = dateString.split("-").map(Number);

  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ============================================
// GET INITIAL RANGE
// ============================================

export function getInitialRange() {
  return getDateRange("MTD");
}

// ============================================
// GET DATE RANGE BY PRESET
// ============================================

export function getDateRange(preset) {
  const today = new Date();

  today.setHours(0, 0, 0, 0);

  const year = today.getFullYear();
  const month = today.getMonth();

  let start;
  let end = new Date(today);

  switch (preset) {
    case "Today": {
      start = new Date(today);
      break;
    }

    case "Yesterday": {
      start = new Date(today);
      start.setDate(start.getDate() - 1);
      end = new Date(start);
      break;
    }

    case "Last 7 Days": {
      start = new Date(today);
      start.setDate(start.getDate() - 6);
      break;
    }

    case "Last 30 Days": {
      start = new Date(today);
      start.setDate(start.getDate() - 29);
      break;
    }

    case "Last 365 Days": {
      start = new Date(today);
      start.setDate(start.getDate() - 364);
      break;
    }

    case "MTD": {
      start = new Date(year, month, 1);
      break;
    }

    case "QTD": {
      const quarterStartMonth = Math.floor(month / 3) * 3;
      start = new Date(year, quarterStartMonth, 1);
      break;
    }

    case "YTD": {
      start = new Date(year, 0, 1);
      break;
    }

    case "Q1": {
      start = new Date(year, 0, 1);
      end = new Date(year, 2, 31);
      break;
    }

    case "Q2": {
      start = new Date(year, 3, 1);
      end = new Date(year, 5, 30);
      break;
    }

    case "Q3": {
      start = new Date(year, 6, 1);
      end = new Date(year, 8, 30);
      break;
    }

    case "Q4": {
      start = new Date(year, 9, 1);
      end = new Date(year, 11, 31);
      break;
    }

    default: {
      start = new Date(year, month, 1);
      end = new Date(year, month + 1, 0);
    }
  }

  return {
    startDate: toInputDate(start),
    endDate: toInputDate(end),
  };
}

// ============================================
// GET DATABASE DATE BOUNDS
// Inclusive start, exclusive end
// ============================================

export function getDateBounds(startDate, endDate) {
  if (
    !isValidDateString(startDate) ||
    !isValidDateString(endDate) ||
    startDate > endDate
  ) {
    throw new Error("Invalid date range.");
  }

  const [startYear, startMonth, startDay] = startDate.split("-").map(Number);

  const [endYear, endMonth, endDay] = endDate.split("-").map(Number);

  return {
    start: new Date(startYear, startMonth - 1, startDay),
    endExclusive: new Date(endYear, endMonth - 1, endDay + 1),
  };
}

// ============================================
// CHECK DATE WITHIN RANGE
// ============================================

export function isWithinRange(dateValue, start, endExclusive) {
  if (!dateValue) {
    return false;
  }

  const date = new Date(dateValue);

  return !Number.isNaN(date.getTime()) && date >= start && date < endExclusive;
}

// ============================================
// GET REVENUE CARD DATE RANGES
// Today, MTD and YTD
// ============================================

export function getRevenueDateRanges(referenceDate = new Date()) {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const day = referenceDate.getDate();

  const todayStart = new Date(year, month, day);
  const tomorrowStart = new Date(year, month, day + 1);

  const monthStart = new Date(year, month, 1);
  const nextMonthStart = new Date(year, month + 1, 1);

  const yearStart = new Date(year, 0, 1);
  const nextYearStart = new Date(year + 1, 0, 1);

  return {
    todayStart,
    tomorrowStart,
    monthStart,
    nextMonthStart,
    yearStart,
    nextYearStart,
  };
}
