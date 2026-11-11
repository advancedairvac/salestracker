
import {
  addHours,
  addDays,
  addOneMonth,
} from "@/lib/opportunities/date-helpers";

export function getStandardFollowUps(opportunityDate) {
  return [
    {
      sequence: 1,
      dueAt: addHours(opportunityDate, 24),
    },
    {
      sequence: 2,
      dueAt: addHours(opportunityDate, 36),
    },
    {
      sequence: 3,
      dueAt: addDays(opportunityDate, 7),
    },
    {
      sequence: 4,
      dueAt: addDays(opportunityDate, 14),
    },
    {
      sequence: 5,
      dueAt: addOneMonth(opportunityDate),
    },
  ];
}
