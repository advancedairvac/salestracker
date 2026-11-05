import Link from "next/link";

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
            {opportunities.length > 0 ? (
              opportunities.map((opportunity) => (
                <tr
                  key={opportunity.id}
                  className="border-b border-[#d9d9d9] transition-colors hover:bg-[#f8f8f8]"
                >
                  <td className="whitespace-nowrap px-4 py-2 text-black text-xs lg:text-sm">
                    <Link
                      href={`/admin/opportunities/${opportunity.id}`}
                      className="underline underline-offset-2"
                    >
                      {opportunity.serviceTitanEstimateId || "—"}
                    </Link>
                  </td>

                  <td className="whitespace-nowrap px-4 py-2 text-black text-xs lg:text-sm">
                    {opportunity.customer?.businessName || "—"}
                  </td>

                  <td className="whitespace-nowrap px-4 py-2 text-black text-xs lg:text-sm">
                    {formatCurrency(opportunity.value, currency)}
                  </td>

                  <td className="whitespace-nowrap px-4 py-2 text-black text-xs lg:text-sm">
                    <Link
                      href={`/admin/opportunities/${opportunity.id}`}
                      className="underline underline-offset-2"
                    >
                      {opportunity.assignedTo?.name || "—"}
                    </Link>
                  </td>

                  <td className="whitespace-nowrap px-4 py-2 text-black text-xs lg:text-sm">
                    {formatSource(opportunity.source)}
                  </td>

                  <td className="whitespace-nowrap px-4 py-2 text-black text-xs lg:text-sm">
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
    </section>
  );
}
