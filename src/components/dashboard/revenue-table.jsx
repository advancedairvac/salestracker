
function formatCurrency(amount, currency) {
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

export default function RevenueTable({
  sales = [],
  currency = "$",
  className = "",
}) {
  return (
    <section className={`w-full ${className}`}>
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[650px] border-collapse text-left">
          <thead>
            <tr className="bg-[#d9d9d9]">
              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-black sm:text-xs">
                Titan Job#
              </th>

              <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-black sm:text-xs">
                Customer
              </th>

              <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-black sm:text-xs">
                Value
              </th>

              <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-black sm:text-xs">
                Source
              </th>

              <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-black sm:text-xs">
                Salesman
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
                    {sale.salesmanName ? (
                      <span className="underline underline-offset-2">
                        {sale.salesmanName}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-sm text-[#777]"
                >
                  No sales records found for this date range.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {sales.length > 0 && (
        <p className="mt-2 text-right text-xs text-[#777]">
          {sales.length} {sales.length === 1 ? "Sale" : "Sales"}
        </p>
      )}
    </section>
  );
}
