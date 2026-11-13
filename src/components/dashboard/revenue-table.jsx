"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import TablePagination from "@/components/dashboard/table-pagination";

// ============================================
// HELPERS
// ============================================

function formatCurrency(amount, currency) {
  return `${currency}${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
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
// REVENUE TABLE
// ============================================

export default function RevenueTable({
  sales = [],
  currentPage = 1,
  pageSize = 10,
  totalItems = 0,
  currency = "$",
  className = "",
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // ============================================
  // UPDATE URL PARAMETERS
  // ============================================

  function updatePagination(params) {
    const query = new URLSearchParams(searchParams.toString());

    Object.entries(params).forEach(([key, value]) => {
      query.set(key, String(value));
    });

    router.push(`${pathname}?${query.toString()}`);
  }

  // ============================================
  // HANDLE PAGE CHANGE
  // ============================================

  function handlePageChange(page) {
    if (page < 1 || page === currentPage) {
      return;
    }

    updatePagination({
      page,
      pageSize,
    });
  }

  // ============================================
  // HANDLE PAGE SIZE CHANGE
  // ============================================

  function handlePageSizeChange(size) {
    if (![10, 20, 50, 100].includes(size)) {
      return;
    }

    updatePagination({
      page: 1,
      pageSize: size,
    });
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <section className={`w-full ${className}`}>
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[700px] border-collapse text-left">
          <thead>
            <tr className="bg-[#d9d9d9]">
              <th className="whitespace-nowrap px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-black sm:text-xs">
                Titan Job#
              </th>

              <th className="whitespace-nowrap px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-black sm:text-xs">
                Customer
              </th>

              <th className="whitespace-nowrap px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-black sm:text-xs">
                Value
              </th>

              <th className="whitespace-nowrap px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-black sm:text-xs">
                Source
              </th>

              <th className="whitespace-nowrap px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-black sm:text-xs">
                Comm. Est.
              </th>
            </tr>
          </thead>

          <tbody>
            {sales.length > 0 ? (
              sales.map((sale) => (
                <tr
                  key={sale.id}
                  className="border-b border-[#d9d9d9] transition-colors hover:bg-[#f8f8f8]"
                >
                  <td className="whitespace-nowrap px-4 py-2 text-sm text-black sm:text-base">
                    {sale.serviceTitanJobId || "—"}
                  </td>

                  <td className="whitespace-nowrap px-4 py-2 text-sm text-black sm:text-base">
                    {sale.customerName || "—"}
                  </td>

                  <td className="whitespace-nowrap px-4 py-2 text-sm text-black sm:text-base">
                    {formatCurrency(sale.saleValue, currency)}
                  </td>

                  <td className="whitespace-nowrap px-4 py-2 text-sm text-black sm:text-base">
                    {formatSource(sale.source)}
                  </td>

                  <td className="whitespace-nowrap px-4 py-2 text-sm text-black sm:text-base">
                    {formatCurrency(sale.commissionEstimate, currency)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-sm text-[#777]"
                >
                  No completed jobs found for this date range.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* SERVER-SIDE PAGINATION */}

      <TablePagination
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={totalItems}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />
    </section>
  );
}
