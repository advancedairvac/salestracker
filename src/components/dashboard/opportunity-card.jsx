import Link from "next/link";

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDate(date) {
  if (!date) return "—";

  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getStatusStyle(status) {
  const styles = {
    OPEN: "bg-neutral-100 text-neutral-800",
    WON: "bg-green-100 text-green-700",
    LOST: "bg-red-100 text-red-700",
    TEMPORARILY_CLOSED: "bg-amber-100 text-amber-700",
    PERMANENTLY_CLOSED: "bg-neutral-200 text-neutral-700",
    SCHEDULED_TO_REOPEN: "bg-blue-100 text-blue-700",
  };

  return styles[status] || "bg-neutral-100 text-neutral-700";
}

function getStatusLabel(status) {
  const labels = {
    OPEN: "Open",
    WON: "Won",
    LOST: "Lost",
    TEMPORARILY_CLOSED: "Temporarily Closed",
    PERMANENTLY_CLOSED: "Permanently Closed",
    SCHEDULED_TO_REOPEN: "Scheduled to Reopen",
  };

  return labels[status] || status;
}

function getSourceLabel(source) {
  const labels = {
    SELF_GENERATED: "Self Generated",
    COMPANY_GENERATED: "Company Generated",
  };

  return labels[source] || source || "—";
}

export default function OpportunityCard({ opportunity }) {
  const customer = opportunity.customer;
  const assignedTo = opportunity.assignedTo;

  return (
    <Link
      href={`/admin/opportunities/${opportunity.id}`}
      className="group block w-full border border-[#d5d5d5] bg-white p-4 text-left transition-colors hover:border-[#777] sm:p-[18px]"
    >
      {/* Name and Status */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[19px] font-extrabold uppercase leading-tight tracking-[-0.4px] text-black sm:text-xl">
            {customer?.businessName ||
              opportunity.title ||
              "Untitled Opportunity"}
          </h3>

          {opportunity.jobType && (
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-[#666] sm:text-[13px]">
              {opportunity.jobType}
            </p>
          )}
        </div>

        <span
          className={`shrink-0 rounded-sm px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${getStatusStyle(opportunity.status)}`}
        >
          {getStatusLabel(opportunity.status)}
        </span>
      </div>

      {/* Estimate Value */}
      <div className="mt-4">
        <strong className="text-xl font-extrabold tracking-tight text-black sm:text-2xl">
          {formatCurrency(opportunity.value)}
        </strong>
        <p className="mt-0.5 text-xs uppercase tracking-wide text-[#777]">
          Estimated Value
        </p>
      </div>

      {/* Divider */}
      <div className="my-4 border-t border-[#e5e5e5]" />

      {/* Opportunity Details */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#888]">
            Customer
          </p>
          <p className="mt-1 truncate text-sm font-semibold text-black">
            {customer?.pocName || "—"}
          </p>
        </div>

        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#888]">
            Assigned To
          </p>
          <p className="mt-1 truncate text-sm font-semibold text-black">
            {assignedTo?.name || "Unassigned"}
          </p>
        </div>

        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#888]">
            Lead Source
          </p>
          <p className="mt-1 truncate text-sm font-medium text-[#333]">
            {getSourceLabel(opportunity.source)}
          </p>
        </div>

        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#888]">
            Opportunity Date
          </p>
          <p className="mt-1 text-sm font-medium text-[#333]">
            {formatDate(opportunity.opportunityDate)}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between border-t border-[#e5e5e5] pt-3">
        <span className="text-xs font-medium text-[#777] transition-colors group-hover:text-black">
          View Opportunity
        </span>

        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="h-6 w-6 shrink-0 text-[#555] transition-transform group-hover:translate-x-1"
          aria-hidden="true"
        >
          <path
            d="M9 5L16 12L9 19"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </Link>
  );
}
