export function getOpportunityCustomer(opportunity) {
  return opportunity?.customer || opportunity?.customerSnapshot || null;
}
