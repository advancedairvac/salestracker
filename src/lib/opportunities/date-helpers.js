export { addDays } from "@/lib/date/date-utils";

export function parseDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

export function parseManualFollowUpDate(value) {
  const date = parseDate(value);

  if (!date) return null;

  date.setHours(7, 30, 0, 0);

  return date;
}

export function addHours(date, hours) {
  const result = new Date(date);

  if (Number.isNaN(result.getTime()) || !Number.isFinite(hours)) {
    throw new Error("Invalid date or hour value.");
  }

  return new Date(result.getTime() + hours * 60 * 60 * 1000);
}

export function addOneMonth(date) {
  const result = new Date(date);

  if (Number.isNaN(result.getTime())) {
    throw new Error("Invalid date.");
  }

  const originalDay = result.getDate();

  result.setDate(1);
  result.setMonth(result.getMonth() + 1);

  const lastDayOfMonth = new Date(
    result.getFullYear(),
    result.getMonth() + 1,
    0,
  ).getDate();

  result.setDate(Math.min(originalDay, lastDayOfMonth));

  return result;
}
