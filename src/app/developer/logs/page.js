
export const metadata = {
  title: "System Logs",
};

export default function LogsPage() {
  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-2xl font-semibold">System Logs</h2>
        <p className="mt-2 text-sm text-gray-500">
          A placeholder for application errors and diagnostic events.
        </p>
      </section>

      <section className="rounded-xl border border-black/10 bg-white p-5">
        <h3 className="font-semibold">Recent Events</h3>
        <div className="mt-4 rounded-lg bg-gray-50 p-4">
          <p className="text-sm font-medium">No logs loaded</p>
          <p className="mt-1 text-sm text-gray-500">
            Connect a server-side logging provider before displaying production logs.
          </p>
        </div>
        <p className="mt-4 text-xs text-gray-400">
          Never display secrets, access tokens, or database credentials in logs.
        </p>
      </section>
    </div>
  );
}
