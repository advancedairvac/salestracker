
const AUTO_ASSIGN_WINDOW_DAYS = 3;

export function validateJobAutoAssignment({
  opportunity,
  job,
  now = new Date(),
}) {
  if (!opportunity || !job) {
    return {
      eligible: false,
      reason: "MISSING_DATA",
    };
  }

  if (opportunity.status !== "WON") {
    return {
      eligible: false,
      reason: "OPPORTUNITY_NOT_WON",
    };
  }

  if (!opportunity.titanJobId || !job.id) {
    return {
      eligible: false,
      reason: "MISSING_JOB_ID",
    };
  }

  if (String(opportunity.titanJobId) !== String(job.id)) {
    return {
      eligible: false,
      reason: "JOB_ID_MISMATCH",
    };
  }

  const opportunityCreatedAt = new Date(opportunity.createdAt);
  const jobCreatedAt = new Date(job.createdOn);

  if (
    Number.isNaN(opportunityCreatedAt.getTime()) ||
    Number.isNaN(jobCreatedAt.getTime())
  ) {
    return {
      eligible: false,
      reason: "INVALID_DATE",
    };
  }

  // Opportunity must be created before the ServiceTitan Job.
  if (opportunityCreatedAt >= jobCreatedAt) {
    return {
      eligible: false,
      reason: "OPPORTUNITY_CREATED_TOO_LATE",
    };
  }

  const deadline = new Date(jobCreatedAt);
  deadline.setDate(
    deadline.getDate() + AUTO_ASSIGN_WINDOW_DAYS,
  );

  // Auto assignment must happen within 3 days of Job creation.
  if (now > deadline) {
    return {
      eligible: false,
      reason: "AUTO_ASSIGN_WINDOW_EXPIRED",
    };
  }

  return {
    eligible: true,
    reason: "ELIGIBLE",
  };
}
