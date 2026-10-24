
import StatCard from "@/components/dashboard/stat-card";
import RecentActivities from "@/components/dashboard/recent-activities";

export const metadata = {
  title: "Sales Dashboard",
};

export default function SalespersonDashboardPage() {
  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-medium text-[#0690c8]">
          MY WORKSPACE
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-[#0d0d0d]">
          Welcome back, Salesperson
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          Keep track of your leads, estimates, and customer follow-ups.
        </p>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="My Leads" value="24" detail="Demo records" symbol="L" />
        <StatCard title="My Opportunities" value="12" detail="In progress" symbol="O" />
        <StatCard title="Quotes Awaiting Reply" value="7" detail="Follow up when due" symbol="Q" />
        <StatCard title="My Closed Sales" value="8" detail="Demo records" symbol="S" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <RecentActivities
          activities={[
            {
              id: 1,
              title: "Follow up on presented estimate",
              person: "Demo Customer",
              time: "Due today · Demo",
              type: "Follow-up",
            },
            {
              id: 2,
              title: "Contact a new lead",
              person: "Sample Lead",
              time: "Tomorrow · Demo",
              type: "Lead",
            },
            {
              id: 3,
              title: "Review an open opportunity",
              person: "Demo Customer",
              time: "Upcoming · Demo",
              type: "Opportunity",
            },
          ]}
        />

        <section className="rounded-2xl border border-black/[0.08] bg-white p-6 shadow-sm">
          <h3 className="font-semibold text-[#0d0d0d]">
            Follow-up workflow
          </h3>
          <p className="mt-2 text-sm leading-6 text-gray-500">
            The planned reminder sequence is 24 hours after presenting an estimate,
            then 3 days, then 1 week if the customer has not responded.
          </p>
          <div className="mt-5 space-y-3">
            {["24 hours after presentation", "3 days after presentation", "1 week after presentation"].map((item, index) => (
              <div key={item} className="flex items-center gap-3 rounded-xl bg-[#f8f9fb] p-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e7f6fc] text-sm font-semibold text-[#0675a0]">
                  {index + 1}
                </span>
                <span className="text-sm text-gray-700">{item}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
