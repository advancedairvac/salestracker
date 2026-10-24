
export const metadata = {
  title: "Sales Pipeline",
};

const stages = [
  { name: "New Opportunity", count: 4 },
  { name: "Contacted", count: 3 },
  { name: "Quote Presented", count: 5 },
  { name: "Negotiation", count: 2 },
  { name: "Won", count: 3 },
];

export default function PipelinePage() {
  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-2xl font-semibold">Sales Pipeline</h2>
        <p className="mt-2 text-sm text-gray-500">
          Review opportunities by their current sales stage.
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stages.map((stage) => (
          <section key={stage.name} className="rounded-xl border border-black/10 bg-white p-5">
            <p className="text-sm text-gray-500">{stage.name}</p>
            <p className="mt-3 text-3xl font-semibold">{stage.count}</p>
            <p className="mt-1 text-xs text-gray-400">Demo opportunities</p>
          </section>
        ))}
      </div>

      <p className="text-xs text-gray-400">
        Pipeline stages and counts are illustrative, not live records.
      </p>
    </div>
  );
}
