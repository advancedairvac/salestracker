
import Skeleton from "./skeleton";

export default function TeamCardSkeleton({
  count = 3,
  className = "",
}) {
  return (
    <section
      className={`space-y-3 ${className}`}
      aria-label="Loading sales team"
      aria-busy="true"
      role="status"
    >
      <div className="flex items-center justify-between gap-3">
        <Skeleton width="160px" height="14px" />
        <Skeleton width="85px" height="12px" />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3">
        {Array.from({ length: count }).map((_, index) => (
          <div
            key={index}
            className="border border-[#d5d5d5] bg-white p-4 sm:p-[18px]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton width="150px" height="18px" />
                <Skeleton width="110px" height="12px" />
              </div>

              <Skeleton width="24px" height="24px" />
            </div>

            <div className="mt-6 flex items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <Skeleton width="55px" height="15px" />
                <Skeleton width="45px" height="15px" />
                <Skeleton width="40px" height="15px" />
              </div>

              <Skeleton width="36px" height="36px" circle />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
