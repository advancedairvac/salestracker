
import Skeleton from "./skeleton";

export default function SummarySkeleton({
  items = 3,
  variant = "cards",
  className = "",
}) {
  // ============================================
  // REVENUE SUMMARY SKELETON
  // ============================================

  if (variant === "revenue") {
    return (
      <section
        className={`w-full bg-white px-4 py-8 lg:px-8 lg:py-18 ${className}`}
        aria-label="Loading revenue summary"
        role="status"
      >
        {/* GOAL PROGRESS */}

        <div className="flex items-center gap-5 sm:gap-7">
          {/* CIRCULAR PROGRESS */}

          <div className="relative h-[110px] w-[110px] shrink-0">
            <Skeleton
              width="110px"
              height="110px"
              circle
            />

            <div className="absolute inset-0 flex items-center justify-center">
              <Skeleton
                width="38px"
                height="24px"
              />
            </div>
          </div>

          {/* GOAL AMOUNT AND LABEL */}

          <div className="min-w-0 flex-1">
            <Skeleton
              width="130px"
              height="30px"
            />

            <Skeleton
              width="105px"
              height="12px"
              className="mt-2"
            />
          </div>
        </div>

        {/* REVENUE AND COMMISSION */}

        <div className="mt-7 space-y-3 pl-1">
          <Skeleton
            width="200px"
            height="48px"
            className="max-w-full"
          />

          <Skeleton
            width="155px"
            height="14px"
          />
        </div>
      </section>
    );
  }

  // ============================================
  // DEFAULT SUMMARY CARDS SKELETON
  // ============================================

  return (
    <div
      className={`grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 ${className}`}
    >
      {Array.from({ length: items }).map((_, index) => (
        <div
          key={index}
          className="border border-[#d5d5d5] bg-white p-4"
        >
          <Skeleton width="90px" height="13px" />

          <Skeleton
            width="65%"
            height="25px"
            className="mt-4"
          />

          <Skeleton
            width="45%"
            height="12px"
            className="mt-3"
          />
        </div>
      ))}
    </div>
  );
}
