
 // ============================================
// GET OPPORTUNITY VALUE
// ============================================

export function getOpportunityValue(opportunity) {
  const value = Number(opportunity?.value || 0);

  return Number.isFinite(value) ? value : 0;
}

// ============================================
// FILTER OPEN OPPORTUNITIES
// ============================================

export function getOpenOpportunities(opportunities = []) {
  return opportunities.filter(
    (opportunity) => opportunity.status === "OPEN",
  );
}

// ============================================
// CALCULATE PIPELINE VALUE
// ============================================

export function calculatePipelineValue(opportunities = []) {
  const openOpportunities = getOpenOpportunities(opportunities);

  return openOpportunities.reduce(
    (total, opportunity) => total + getOpportunityValue(opportunity),
    0,
  );
}

// ============================================
// GET PIPELINE SUMMARY
// ============================================

export function getPipelineSummary(opportunities = []) {
  const openOpportunities = getOpenOpportunities(opportunities);

  return {
    totalOpportunities: opportunities.length,
    openOpportunities: openOpportunities.length,
    pipelineValue: openOpportunities.reduce(
      (total, opportunity) => total + getOpportunityValue(opportunity),
      0,
    ),
  };
}
