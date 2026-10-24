
export const metadata = {
  title: "Quotes & Estimates",
};

const quotes = [
  { number: "EST-1001", customer: "Demo Customer One", amount: "$1,200.00", presented: "Sample date", status: "Awaiting Reply" },
  { number: "EST-1002", customer: "Demo Customer Two", amount: "$850.00", presented: "Sample date", status: "Follow-up Due" },
];

export default function QuotesPage() {
  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-2xl font-semibold">Quotes & Estimates</h2>
        <p className="mt-2 text-sm text-gray-500">
          Track estimates, their values, and customer responses.
        </p>
      </section>

      <section className="rounded-xl border border-black/10 bg-white p-5">
        <h3 className="font-semibold">Estimate List</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[650px] text-left text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-gray-500">
                <th className="p-3 font-medium">Estimate #</th>
                <th className="p-3 font-medium">Customer</th>
                <th className="p-3 font-medium">Amount</th>
                <th className="p-3 font-medium">Presented</th>
                <th className="p-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((quote) => (
                <tr key={quote.number} className="border-b last:border-0">
                  <td className="p-3 font-medium">{quote.number}</td>
                  <td className="p-3">{quote.customer}</td>
                  <td className="p-3">{quote.amount}</td>
                  <td className="p-3">{quote.presented}</td>
                  <td className="p-3">{quote.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-gray-400">Demo estimates only.</p>
      </section>
    </div>
  );
}
