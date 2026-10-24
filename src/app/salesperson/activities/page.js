
export const metadata = {
  title: "Activities & Follow-ups",
};

const activities = [
  { task: "Follow up on estimate", customer: "Demo Customer One", due: "24 hours after presentation", status: "Pending" },
  { task: "Second follow-up", customer: "Demo Customer Two", due: "3 days after presentation", status: "Pending" },
  { task: "Final follow-up", customer: "Demo Customer Three", due: "1 week after presentation", status: "Pending" },
];

export default function ActivitiesPage() {
  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-2xl font-semibold">Activities & Follow-ups</h2>
        <p className="mt-2 text-sm text-gray-500">
          Keep track of calls, tasks, and estimate follow-up reminders.
        </p>
      </section>

      <section className="rounded-xl border border-black/10 bg-white p-5">
        <h3 className="font-semibold">Follow-up Schedule</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-gray-500">
                <th className="p-3 font-medium">Activity</th>
                <th className="p-3 font-medium">Customer</th>
                <th className="p-3 font-medium">Due</th>
                <th className="p-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {activities.map((activity) => (
                <tr key={activity.task} className="border-b last:border-0">
                  <td className="p-3 font-medium">{activity.task}</td>
                  <td className="p-3">{activity.customer}</td>
                  <td className="p-3">{activity.due}</td>
                  <td className="p-3">{activity.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-gray-400">
          This is a visual reminder plan only. Automated notifications are not active yet.
        </p>
      </section>
    </div>
  );
}
