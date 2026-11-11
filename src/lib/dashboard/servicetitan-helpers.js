

// ============================================
// GET JOB VALUE
// ============================================

export function getJobValue(job) {
  const value = Number(job?.total);

  return Number.isFinite(value) ? value : 0;
}

// ============================================
// CHECK COMPLETED JOB
// ============================================

export function isCompletedJob(job) {
  return (
    String(job?.jobStatus || "").toLowerCase() === "completed" &&
    Boolean(job?.completedOn)
  );
}

// ============================================
// FILTER COMPLETED JOBS
// ============================================

export function getCompletedJobs(jobs = []) {
  return jobs.filter(
    (job) => isCompletedJob(job) && getJobValue(job) > 0,
  );
}

// ============================================
// CALCULATE JOB REVENUE
// ============================================

export function calculateJobRevenue(jobs = []) {
  return jobs.reduce(
    (total, job) => total + getJobValue(job),
    0,
  );
}
