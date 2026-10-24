
export const metadata = {
  title: "Finance",
};

export default function FinancePage() {
  const items = [
    { label: "Total Revenue", value: "$0.00" },
    { label: "Collected Payments", value: "$0.00" },
    { label: "Outstanding Amount", value: "$0.00" },
    { label: "Closed Sales", value: "0" },
  ];

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-2xl font-semibold text-[#0d0d0d]">Finance</h2>
        <p className="mt-2 text-sm text-gray-500">
          Review revenue, payments, and outstanding amounts.
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <section
            key={item.label}
            className="rounded-xl border border-black/10 bg-white p-5"
          >
            <p className="text-sm text-gray-500">{item.label}</p>
            <p className="mt-3 text-2xl font-semibold">{item.value}</p>
          </section>
        ))}
      </div>

      <section className="rounded-xl border border-black/10 bg-white p-5">
        <h3 className="font-semibold">Finance Summary</h3>
        <p className="mt-2 text-sm leading-6 text-gray-500">
          Financial totals will be calculated from recorded sales and payment
          data after the database integration is implemented.
        </p>
        <p className="mt-3 text-xs text-gray-400">
          No real financial data is displayed.
        </p>
      </section>
    </div>
  );
}
