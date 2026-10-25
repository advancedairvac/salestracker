import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Integrations",
};

export const dynamic = "force-dynamic";

export default async function IntegrationsPage({ searchParams }) {
  const params = await searchParams;
  const status = params?.status;

  const connection = await prisma.quickBooksConnection.findFirst({
    orderBy: { updatedAt: "desc" },
    select: {
      realmId: true,
      updatedAt: true,
    },
  });

  const isConnected = Boolean(connection);

  const statusMessages = {
    disconnected: {
      type: "success",
      text: "The local QuickBooks connection was removed.",
    },
    "not-connected": {
      type: "info",
      text: "No matching QuickBooks connection was found.",
    },
    "disconnect-failed": {
      type: "error",
      text: "Disconnect failed. Please try again.",
    },
  };

  const statusMessage = statusMessages[status];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <section>
        <h2 className="text-2xl font-semibold text-[#0d0d0d]">Integrations</h2>
        <p className="mt-2 text-sm text-gray-500">
          Manage external services and review integration status.
        </p>
      </section>

      {/* Action Feedback */}
      {statusMessage && (
        <div
          role="status"
          className={`rounded-lg border p-4 text-sm ${
            statusMessage.type === "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : statusMessage.type === "error"
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-blue-200 bg-blue-50 text-blue-800"
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      {/* QuickBooks */}
      <section className="rounded-xl border border-black/10 bg-white p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f2f2f2] text-lg font-bold text-[#0d0d0d]">
                Q
              </div>

              <div>
                <h3 className="font-semibold text-[#0d0d0d]">QuickBooks</h3>
                <p className="text-xs text-gray-500">Accounting integration</p>
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-gray-600">
              Connect your QuickBooks Sandbox company and verify access to
              company information.
            </p>
          </div>

          <span
            className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-medium ${
              isConnected
                ? "bg-green-50 text-green-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {isConnected ? "Connected in Database" : "Not Connected"}
          </span>
        </div>

        {connection && (
          <div className="mt-4 rounded-lg bg-[#f8f8f8] p-3">
            <p className="text-xs text-gray-500">Connected company ID</p>
            <p className="mt-1 break-all text-sm text-[#0d0d0d]">
              {connection.realmId}
            </p>
            <p className="mt-2 text-xs text-gray-500">
              Last token record update: {connection.updatedAt.toLocaleString()}
            </p>
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-3 border-t border-black/10 pt-5">
          <a
            href="/api/quickbooks/connect"
            className="inline-flex items-center justify-center rounded-lg bg-[#0d0d0d] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#262626]"
          >
            {isConnected ? "Reconnect QuickBooks" : "Connect QuickBooks"}
          </a>

          <Link
            href="/api/quickbooks/company"
            className="inline-flex items-center justify-center rounded-lg border border-black/15 bg-white px-4 py-2.5 text-sm font-medium text-[#0d0d0d] transition hover:bg-gray-50"
          >
            Verify Company API
          </Link>

          {connection && (
            <form
              action="/api/quickbooks/disconnect"
              method="POST"
              onSubmit={undefined}
            >
              <input type="hidden" name="realmId" value={connection.realmId} />

              <button
                type="submit"
                onClick={undefined}
                className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-50"
              >
                Disconnect
              </button>
            </form>
          )}
        </div>

        <p className="mt-3 text-xs leading-5 text-gray-500">
          Verification returns a JSON response. Disconnect removes the locally
          stored token record; it does not revoke authorization at Intuit.
        </p>
      </section>

      {/* Database */}
      <section className="rounded-xl border border-black/10 bg-white p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="font-semibold text-[#0d0d0d]">Database</h3>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              PostgreSQL database connection monitoring and diagnostics.
            </p>
          </div>

          <span className="inline-flex w-fit items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
            Monitoring Not Configured
          </span>
        </div>

        <div className="mt-5 border-t border-black/10 pt-4">
          <p className="text-sm text-gray-500">
            Dedicated database monitoring has not been implemented yet.
          </p>
        </div>
      </section>
    </div>
  );
}
