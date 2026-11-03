import { Inbox } from "lucide-react";

export default function EmptyState({
  title = "No data available",
  description = "There are no records to display yet.",
  action,
}) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center px-5 py-10 text-center">
      <div className="mb-4 flex h-11 w-11 items-center justify-center border border-neutral-200 text-neutral-500">
        <Inbox size={20} strokeWidth={1.6} />
      </div>

      <h3 className="text-sm font-bold text-neutral-900">{title}</h3>

      <p className="mt-2 max-w-sm text-xs leading-5 text-neutral-500">
        {description}
      </p>

      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}