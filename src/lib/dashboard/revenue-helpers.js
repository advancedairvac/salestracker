
 // ============================================
 // GET SALE VALUE
 // ============================================

export function getSaleValue(sale) {
  const value = Number(sale?.saleValue || 0);

  return Number.isFinite(value) ? value : 0;
}

// ============================================
// CALCULATE TOTAL SALES REVENUE
// ============================================

export function calculateSalesRevenue(sales = []) {
  return sales.reduce(
    (total, sale) => total + getSaleValue(sale),
    0,
  );
}

// ============================================
// CALCULATE REVENUE BY SALESPERSON
// ============================================

export function getRevenueByMember(sales = []) {
  const revenueByMember = new Map();

  for (const sale of sales) {
    if (!sale.salesmanId) {
      continue;
    }

    const currentRevenue = revenueByMember.get(sale.salesmanId) || 0;

    revenueByMember.set(
      sale.salesmanId,
      currentRevenue + getSaleValue(sale),
    );
  }

  return revenueByMember;
}
