"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

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
  currentPage = 1,
  pageSize = 10,
  totalItems = 0,
  serverPaginated = true,
  currency = "$",
  className = "",
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Local pagination is retained for the legacy USER filter.
  const [localPage, setLocalPage] = useState(1);
  const [localPageSize, setLocalPageSize] = useState(10);

  // ============================================
  // URL PAGINATION
  // ============================================

  function updatePagination(params) {
    const query = new URLSearchParams(searchParams.toString());

    Object.entries(params).forEach(([key, value]) => {
      query.set(key, String(value));
    });

    router.push(`${pathname}?${query.toString()}`);
  }

  // ============================================
  // PAGE CHANGE
  // ============================================

  function handlePageChange(page) {
    const activePage = serverPaginated ? currentPage : localPage;

    if (page < 1 || page === activePage) {
      return;
    }

    if (serverPaginated) {
      updatePagination({
        page,
        pageSize,
      });

      return;
    }

    setLocalPage(page);
  }

  // ============================================
  // PAGE SIZE CHANGE
  // ============================================

  function handlePageSizeChange(size) {
    if (![10, 20, 50, 100].includes(size)) {
      return;
    }

    if (serverPaginated) {
      updatePagination({
        page: 1,
        pageSize: size,
      });

      return;
    }

    setLocalPageSize(size);
    setLocalPage(1);
  }

  // ============================================
  // ACTIVE PAGINATION VALUES
  // ============================================

  const activePage = serverPaginated ? currentPage : localPage;

  const activePageSize = serverPaginated ? pageSize : localPageSize;

  const activeTotalItems = serverPaginated ? totalItems : estimates.length;

  // ============================================
  // LEGACY CLIENT-SIDE PAGINATION
  // Only used for USER filter.
  // ============================================

  const displayedEstimates = useMemo(() => {
    if (serverPaginated) {
      return estimates;
    }

    const startIndex = (localPage - 1) * localPageSize;

    return estimates.slice(startIndex, startIndex + localPageSize);
  }, [estimates, serverPaginated, localPage, localPageSize]);

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
            {displayedEstimates.length > 0 ? (
              displayedEstimates.map((estimate) => (
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

      <TablePagination
        currentPage={activePage}
        pageSize={activePageSize}
        totalItems={activeTotalItems}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />
    </section>
  );
}
