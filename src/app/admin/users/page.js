
export const metadata = {
  title: "Users",
};

const users = [
  {
    id: 1,
    name: "Admin User",
    email: "admin@example.com",
    role: "Admin",
    status: "Active",
  },
  {
    id: 2,
    name: "Salesperson One",
    email: "sales@example.com",
    role: "Salesperson",
    status: "Active",
  },
  {
    id: 3,
    name: "Developer User",
    email: "developer@example.com",
    role: "Developer",
    status: "Active",
  },
];

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-2xl font-semibold text-[#0d0d0d]">
          Users
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          View and manage application user accounts and roles.
        </p>
      </section>

      <section className="rounded-xl border border-black/10 bg-white p-5">
        <h3 className="font-semibold">User Accounts</h3>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-gray-500">
                <th className="p-3 font-medium">Name</th>
                <th className="p-3 font-medium">Email</th>
                <th className="p-3 font-medium">Role</th>
                <th className="p-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b last:border-0">
                  <td className="p-3 font-medium">{user.name}</td>
                  <td className="p-3 text-gray-600">{user.email}</td>
                  <td className="p-3">{user.role}</td>
                  <td className="p-3">
                    <span className="rounded-full bg-green-50 px-3 py-1 text-xs text-green-700">
                      {user.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-gray-400">
          Sample data only. User management is not connected yet.
        </p>
      </section>
    </div>
  );
}
