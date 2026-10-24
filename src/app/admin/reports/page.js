
export const metadata = {
  title: "Reports",
};

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-2xl font-semibold text-[#0d0d0d]">Reports</h2>
        <p className="mt-2 text-sm text-gray-500">
          Review sales performance for a selected period.
        </p>
      </section>

      <section className="rounded-xl border border-black/10 bg-white p-5">
        <h3 className="font-semibold">Report Filters</h3>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <label className="text-sm">
            Report Type
            <select className="mt-2 w-full rounded-lg border border-gray-200 p-3">
              <option>Sales Report</option>
              <option>Lead Report</option>
              <option>Team Performance</option>
              <option>Revenue Report</option>
            </select>
          </label>

          <label className="text-sm">
            Start Date
            <input type="date" className="mt-2 w-full rounded-lg border border-gray-200 p-3" />
          </label>

          <label className="text-sm">
            End Date
            <input type="date" className="mt-2 w-full rounded-lg border border-gray-200 p-3" />
          </label>
        </div>

        <button
          type="button"
          disabled
          className="mt-4 rounded-lg bg-[#0d0d0d] px-4 py-2.5 text-sm text-white opacity-50"
        >
          Generate Report (Not Connected)
        </button>
      </section>

      <section className="rounded-xl border border-black/10 bg-white p-5">
        <h3 className="font-semibold">Report Results</h3>
        <p className="mt-2 text-sm text-gray-500">
          Select report criteria and connect the reporting logic to display
          weekly, monthly, quarterly, year-to-date, or custom-range results.
        </p>
      </section>
    </div>
  );
}
