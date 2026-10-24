
const defaultActivities = [
  {
    id: 1,
    title: "Estimate presented to customer",
    person: "Demo Customer",
    time: "Today · 9:30 AM",
    type: "Quote",
  },
  {
    id: 2,
    title: "Follow-up scheduled",
    person: "Demo Salesperson",
    time: "Today · 10:15 AM",
    type: "Follow-up",
  },
  {
    id: 3,
    title: "New opportunity created",
    person: "Sample Lead",
    time: "Yesterday",
    type: "Lead",
  },
];

export default function RecentActivities({ activities = defaultActivities }) {
  return (
    <section className="rounded-2xl border border-black/[0.08] bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-[#0d0d0d]">Recent Activities</h2>
          <p className="mt-1 text-sm text-gray-500">
            Latest demo updates
          </p>
        </div>
        <span className="rounded-full bg-[#f2f2f2] px-3 py-1 text-xs text-gray-600">
          {activities.length} items
        </span>
      </div>

      {activities.length === 0 ? (
        <div className="mt-6 rounded-xl bg-[#f8f9fb] p-6 text-center">
          <p className="font-medium text-gray-700">No activities yet</p>
          <p className="mt-1 text-sm text-gray-500">
            New activities will appear here when available.
          </p>
        </div>
      ) : (
        <ul className="mt-5 divide-y divide-black/[0.06]">
          {activities.map((activity) => (
            <li key={activity.id} className="flex gap-3 py-4 first:pt-0 last:pb-0">
              <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#0690c8]" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[#0d0d0d]">
                  {activity.title}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {activity.person}
                </p>
                <p className="mt-1 text-xs text-gray-400">{activity.time}</p>
              </div>
              <span className="h-fit rounded-md bg-[#f2f2f2] px-2 py-1 text-xs text-gray-600">
                {activity.type}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
