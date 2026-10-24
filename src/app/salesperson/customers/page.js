
export const metadata = {
  title: "Customers",
};

const customers = [
  { name: "Demo Customer One", company: "Sample Company", email: "customer1@example.com", phone: "Not provided" },
  { name: "Demo Customer Two", company: "Example Business", email: "customer2@example.com", phone: "Not provided" },
];

export default function CustomersPage() {
  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-2xl font-semibold">My Customers</h2>
        <p className="mt-2 text-sm text-gray-500">
          View customer contact information and company details.
        </p>
      </section>

      <section className="rounded-xl border border-black/10 bg-white p-5">
        <h3 className="font-semibold">Customer List</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-gray-500">
                <th className="p-3 font-medium">Customer</th>
                <th className="p-3 font-medium">Company</th>
                <th className="p-3 font-medium">Email</th>
                <th className="p-3 font-medium">Phone</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.name} className="border-b last:border-0">
                  <td className="p-3 font-medium">{customer.name}</td>
                  <td className="p-3">{customer.company}</td>
                  <td className="p-3">{customer.email}</td>
                  <td className="p-3">{customer.phone}</td>
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
