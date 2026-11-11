
import {
  PRESETS,
  getInitialRange,
  isValidDateString,
  getDateBounds,
} from "@/lib/date/date-utils";

// RESOLVE SELECTED DASHBOARD DATE RANGE
export function resolveSelectedDateRange(params = {}) {
  const defaultRange = getInitialRange();

  const requestedStartDate =
    typeof params?.startDate === "string"
      ? params.startDate
      : defaultRange.startDate;

  const requestedEndDate =
    typeof params?.endDate === "string"
      ? params.endDate
      : defaultRange.endDate;

  const validRange =
    isValidDateString(requestedStartDate) &&
    isValidDateString(requestedEndDate) &&
    requestedStartDate <= requestedEndDate;

  const selectedStartDate = validRange
    ? requestedStartDate
    : defaultRange.startDate;

  const selectedEndDate = validRange
    ? requestedEndDate
    : defaultRange.endDate;

  const requestedPreset =
    typeof params?.preset === "string"
      ? params.preset
      : "MTD";

  const selectedPreset = PRESETS.includes(requestedPreset)
    ? requestedPreset
    : "MTD";

  const { start, endExclusive } = getDateBounds(
    selectedStartDate,
    selectedEndDate,
  );

  return {
    selectedStartDate,
    selectedEndDate,
    selectedPreset,
    start,
    endExclusive,
  };
}
