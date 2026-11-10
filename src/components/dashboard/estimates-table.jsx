"use client";

import { useEffect, useMemo, useState } from "react";

import TablePagination from "@/components/dashboard/table-pagination";

// ============================================
// HELPERS
// ============================================

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

// ============================================
// ESTIMATES TABLE
// ============================================

export default function EstimatesTable({
  estimates = [],
  currency = "$",
  className = "",
}) {
  // ============================================
  // PAGINATION STATE
  // ============================================

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const totalItems = estimates.length;
  const totalPages = Math.ceil(totalItems / pageSize);

  useEffect(() => {
    if (currentPage > Math.max(1, totalPages)) {
      setCurrentPage(Math.max(1, totalPages));
    }
  }, [currentPage, totalPages]);

  function handlePageSizeChange(size) {
    setPageSize(size);
    setCurrentPage(1);
  }

  // ============================================
  // PAGINATED DATA
  // ============================================

  const paginatedEstimates = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;

    return estimates.slice(startIndex, startIndex + pageSize);
  }, [estimates, currentPage, pageSize]);

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
            {paginatedEstimates.length > 0 ? (
              paginatedEstimates.map((estimate) => (
                <tr
                  key={estimate.id}
                  className="border-b border-[#d9d9d9] transition-colors hover:bg-[#f8f8f8]"
                >
                  <td className="whitespace-nowrap px-4 py-2 text-xs text-black lg:text-sm">
                    {estimate.serviceTitanEstimateId || "—"}
                  </td>

                  <td className="whitespace-nowrap px-4 py-2 text-xs text-black lg:text-sm">
                    {estimate.customer?.businessName || "—"}
                  </td>

                  <td className="whitespace-nowrap px-4 py-2 text-xs text-black lg:text-sm">
                    {formatCurrency(estimate.value, currency)}
                  </td>

                  <td className="whitespace-nowrap px-4 py-2 text-xs text-black lg:text-sm">
                    {estimate.assignedTo?.name || "—"}
                  </td>

                  <td className="whitespace-nowrap px-4 py-2 text-xs text-black lg:text-sm">
                    {formatSource(estimate.source)}
                  </td>

                  <td className="whitespace-nowrap px-4 py-2 text-xs text-black lg:text-sm">
                    {formatCurrency(estimate.commissionEstimate || 0, currency)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-sm text-[#777]"
                >
                  No estimates found.
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
