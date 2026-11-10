"use client";

import { useEffect, useMemo, useState } from "react";
import TablePagination from "@/components/dashboard/table-pagination";

function formatCurrency(amount, currency = "$") {
  return `${currency}${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0)}`;
}

function formatSource(source) {
  if (source === "SELF_GENERATED") {
    return "Self-generated";
  }

  if (source === "COMPANY_GENERATED") {
    return "Company";
  }

  return source || "—";
}

export default function EstimatesTable({
  opportunities = [],
  currency = "$",
  className = "",
}) {
  // ============================================
  // PAGINATION STATE
  // ============================================

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const totalItems = opportunities.length;

  const totalPages = Math.ceil(totalItems / pageSize);

  // Keep current page within the available page range.
  useEffect(() => {
    if (currentPage > Math.max(1, totalPages)) {
      setCurrentPage(Math.max(1, totalPages));
    }
  }, [currentPage, totalPages]);

  // Reset to first page when page size changes.
  function handlePageSizeChange(size) {
    setPageSize(size);
    setCurrentPage(1);
  }

  // ============================================
  // PAGINATED DATA
  // ============================================

  const paginatedOpportunities = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;

    return opportunities.slice(startIndex, startIndex + pageSize);
  }, [opportunities, currentPage, pageSize]);

  // ============================================
  // RENDER
  // ============================================

  return (
    <section className={`w-full ${className}`}>
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[650px] border-collapse text-left">
          <thead>
            <tr className="bg-[#d9d9d9]">
              <th className="px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-black sm:text-xs">
                Titan#
              </th>

              <th className="px-4 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-black sm:text-xs">
                Customer
              </th>

              <th className="px-4 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-black sm:text-xs">
                Value
              </th>

              <th className="px-4 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-black sm:text-xs">
                Salesman
              </th>

              <th className="px-4 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-black sm:text-xs">
                Source
              </th>

              <th className="px-4 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-black sm:text-xs">
                Comm. Est.
              </th>
            </tr>
          </thead>

          <tbody>
            {paginatedOpportunities.length > 0 ? (
              paginatedOpportunities.map((opportunity) => (
                <tr
                  key={opportunity.id}
                  className="border-b border-[#d9d9d9] transition-colors hover:bg-[#f8f8f8]"
                >
                  <td className="whitespace-nowrap px-4 py-2 text-xs text-black lg:text-sm">
                    {opportunity.serviceTitanEstimateId || "—"}
                  </td>

                  <td className="whitespace-nowrap px-4 py-2 text-xs text-black lg:text-sm">
                    {opportunity.customer?.businessName || "—"}
                  </td>

                  <td className="whitespace-nowrap px-4 py-2 text-xs text-black lg:text-sm">
                    {formatCurrency(opportunity.value, currency)}
                  </td>

                  <td className="whitespace-nowrap px-4 py-2 text-xs text-black lg:text-sm">
                    {opportunity.assignedTo?.name || "—"}
                  </td>

                  <td className="whitespace-nowrap px-4 py-2 text-xs text-black lg:text-sm">
                    {formatSource(opportunity.source)}
                  </td>

                  <td className="whitespace-nowrap px-4 py-2 text-xs text-black lg:text-sm">
                    {formatCurrency(
                      opportunity.commissionEstimate || 0,
                      currency,
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-sm text-[#777]">
                  No open estimates found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}

      <TablePagination
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={totalItems}
        onPageChange={setCurrentPage}
        onPageSizeChange={handlePageSizeChange}
      />
    </section>
  );
}
