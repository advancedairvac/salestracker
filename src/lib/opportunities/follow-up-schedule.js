import {
  addHours,
  addDays,
  addOneMonth,
} from "@/lib/opportunities/date-helpers";

export const STANDARD_FOLLOW_UP_CONFIG = [
  {
    sequence: 1,
    eventType: "H24",
    type: "EMAIL",
    getDueAt: (date) => addHours(date, 24),
  },
  {
    sequence: 2,
    eventType: "H36",
    type: "TEXT",
    getDueAt: (date) => addHours(date, 36),
  },
  {
    sequence: 3,
    eventType: "W1",
    type: "EMAIL",
    getDueAt: (date) => addDays(date, 7),
  },
  {
    sequence: 4,
    eventType: "W2",
    type: "CALL",
    getDueAt: (date) => addDays(date, 14),
  },
  {
    sequence: 5,
    eventType: "M1",
    type: "CALL",
    getDueAt: (date) => addOneMonth(date),
  },
];

export const MANUAL_FOLLOW_UP_CONFIG = {
  sequence: 6,
  eventType: "MANUAL",
  type: "CALL",
};

export function getStandardFollowUps(opportunityDate) {
  const date = new Date(opportunityDate);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid opportunity date.");
  }

  return STANDARD_FOLLOW_UP_CONFIG.map((item) => ({
    sequence: item.sequence,
    eventType: item.eventType,
    type: item.type,
    dueAt: item.getDueAt(date),
  }));
}

export function getManualFollowUp(dueAt = null) {
  return {
    ...MANUAL_FOLLOW_UP_CONFIG,
    dueAt,
  };
}
