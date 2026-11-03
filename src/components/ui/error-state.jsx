import { AlertCircle } from "lucide-react";

export default function ErrorState({
  title = "Something went wrong",
  description = "We couldn't load this information. Please try again.",
  onRetry,
}) {
  return (
    <div
      role="alert"
      className="flex min-h-40 flex-col items-start justify-center gap-3 border border-red-200 bg-red-50/50 p-5"
    >
      <div className="flex items-center gap-2 text-red-700">
        <AlertCircle size={18} />
        <h3 className="text-sm font-bold">{title}</h3>
      </div>

      <p className="text-xs leading-5 text-neutral-600">{description}</p>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold hover:bg-neutral-50"
        >
          Try again
        </button>
      )}
    </div>
  );
}