
export const metadata = {
  title: "Leads",
};

const leads = [
  { name: "Sample Lead One", source: "Company Generated", owner: "Salesperson One", status: "New" },
  { name: "Sample Lead Two", source: "Self Generated", owner: "Salesperson One", status: "Contacted" },
];

export default function LeadsPage() {
  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-2xl font-semibold">My Leads</h2>
        <p className="mt-2 text-sm text-gray-500">
          Track new prospects and where they came from.
        </p>
      </section>

      <section className="rounded-xl border border-black/10 bg-white p-5">
        <h3 className="font-semibold">Lead List</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-gray-500">
                <th className="p-3 font-medium">Lead Name</th>
                <th className="p-3 font-medium">Lead Source</th>
                <th className="p-3 font-medium">Assigned To</th>
                <th className="p-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.name} className="border-b last:border-0">
                  <td className="p-3 font-medium">{lead.name}</td>
                  <td className="p-3">{lead.source}</td>
                  <td className="p-3">{lead.owner}</td>
                  <td className="p-3">{lead.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-gray-400">Sample records only.</p>
      </section>
    </div>
  );
}
