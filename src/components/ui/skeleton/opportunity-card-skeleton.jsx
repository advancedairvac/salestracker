
import Skeleton from "./skeleton";

export default function OpportunityCardSkeleton({
  count = 6,
  className = "",
}) {
  return (
    <section
      className={`space-y-4 ${className}`}
      aria-label="Loading opportunities"
      aria-busy="true"
      role="status"
    >
      {/* STATUS TABS */}

      <div className="flex flex-wrap gap-2">
        <Skeleton width="76px" height="34px" />
        <Skeleton width="72px" height="34px" />
        <Skeleton width="72px" height="34px" />
        <Skeleton width="86px" height="34px" />
        <Skeleton width="65px" height="34px" />
      </div>

      {/* OPPORTUNITY SUMMARY */}

      <div className="flex items-center justify-between gap-3">
        <Skeleton width="100px" height="14px" />
        <Skeleton width="100px" height="12px" />
      </div>

      {/* OPPORTUNITY CARDS */}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3">
        {Array.from({ length: count }).map((_, index) => (
          <div
            key={index}
            className="border border-[#d5d5d5] bg-white p-4 sm:p-[18px]"
          >
            {/* TITLE AND STATUS */}

            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <Skeleton
                  width="75%"
                  height="18px"
                />
              </div>

              <Skeleton
                width="65px"
                height="22px"
              />
            </div>

            {/* ESTIMATED VALUE */}

            <div className="mt-5 space-y-1">
              <Skeleton
                width="110px"
                height="22px"
              />

              <Skeleton
                width="100px"
                height="11px"
              />
            </div>

            {/* DIVIDER */}

            <div className="my-4 border-t border-[#e5e5e5]" />

            {/* OPPORTUNITY DETAILS */}

            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              {/* CUSTOMER */}

              <div className="min-w-0 space-y-2">
                <Skeleton
                  width="65px"
                  height="9px"
                />

                <Skeleton
                  width="90%"
                  height="13px"
                />
              </div>

              {/* ASSIGNED TO */}

              <div className="min-w-0 space-y-2">
                <Skeleton
                  width="70px"
                  height="9px"
                />

                <Skeleton
                  width="85%"
                  height="13px"
                />
              </div>

              {/* LEAD SOURCE */}

              <div className="min-w-0 space-y-2">
                <Skeleton
                  width="75px"
                  height="9px"
                />

                <Skeleton
                  width="80%"
                  height="13px"
                />
              </div>

              {/* OPPORTUNITY DATE */}

              <div className="min-w-0 space-y-2">
                <Skeleton
                  width="90px"
                  height="9px"
                />

                <Skeleton
                  width="80%"
                  height="13px"
                />
              </div>
            </div>

            {/* FOOTER */}

            <div className="mt-4 flex items-center justify-between border-t border-[#e5e5e5] pt-3">
              <Skeleton
                width="110px"
                height="12px"
              />

              <Skeleton
                width="24px"
                height="24px"
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
