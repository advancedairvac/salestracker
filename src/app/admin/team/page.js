
export const metadata = {
  title: "Team",
};

const team = [
  { name: "Salesperson One", role: "Salesperson", leads: 12, sales: 4 },
  { name: "Salesperson Two", role: "Salesperson", leads: 8, sales: 3 },
];

export default function TeamPage() {
  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-2xl font-semibold text-[#0d0d0d]">Team</h2>
        <p className="mt-2 text-sm text-gray-500">
          Review team members and their sales activity.
        </p>
      </section>

      <section className="rounded-xl border border-black/10 bg-white p-5">
        <h3 className="font-semibold">Team Members</h3>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[500px] text-left text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-gray-500">
                <th className="p-3 font-medium">Name</th>
                <th className="p-3 font-medium">Role</th>
                <th className="p-3 font-medium">Leads</th>
                <th className="p-3 font-medium">Closed Sales</th>
              </tr>
            </thead>
            <tbody>
              {team.map((member) => (
                <tr key={member.name} className="border-b last:border-0">
                  <td className="p-3 font-medium">{member.name}</td>
                  <td className="p-3">{member.role}</td>
                  <td className="p-3">{member.leads}</td>
                  <td className="p-3">{member.sales}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-gray-400">
          Illustrative data only.
        </p>
      </section>
    </div>
  );
}
