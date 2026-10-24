
export const metadata = {
  title: "Sales",
};

const sales = [
  { id: "SALE-1001", customer: "Demo Customer One", amount: "$1,200.00", source: "Self Generated", closedBy: "Salesperson One" },
  { id: "SALE-1002", customer: "Demo Customer Two", amount: "$850.00", source: "Company Generated", closedBy: "Salesperson One" },
];

export default function SalesPage() {
  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-2xl font-semibold">My Sales</h2>
        <p className="mt-2 text-sm text-gray-500">
          Review closed sales, lead sources, and the salesperson who closed each deal.
        </p>
      </section>

      <section className="rounded-xl border border-black/10 bg-white p-5">
        <h3 className="font-semibold">Closed Sales</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-gray-500">
                <th className="p-3 font-medium">Sale ID</th>
                <th className="p-3 font-medium">Customer</th>
                <th className="p-3 font-medium">Amount</th>
                <th className="p-3 font-medium">Lead Source</th>
                <th className="p-3 font-medium">Closed By</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id} className="border-b last:border-0">
                  <td className="p-3 font-medium">{sale.id}</td>
                  <td className="p-3">{sale.customer}</td>
                  <td className="p-3">{sale.amount}</td>
                  <td className="p-3">{sale.source}</td>
                  <td className="p-3">{sale.closedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-gray-400">Illustrative records only.</p>
      </section>
    </div>
  );
}
