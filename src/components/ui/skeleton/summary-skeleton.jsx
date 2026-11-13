
import Skeleton from "./skeleton";

export default function SummarySkeleton({
  items = 3,
  className = "",
}) {
  return (
    <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 ${className}`}>
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
