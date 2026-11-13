
import Skeleton from "./skeleton";

export default function TableSkeleton({
  rows = 5,
  columns = 5,
  className = "",
}) {
  return (
    <div
      className={`w-full overflow-hidden border border-[#d5d5d5] bg-white ${className}`}
      aria-label="Loading table"
      role="status"
    >
      {/* TABLE HEADER */}

      <div
        className="grid gap-4 border-b border-[#d5d5d5] px-4 py-4"
        style={{
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton
            key={index}
            width="75%"
            height="13px"
          />
        ))}
      </div>

      {/* TABLE ROWS */}

      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="grid gap-4 border-b border-[#eeeeee] px-4 py-4 last:border-b-0"
          style={{
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          }}
        >
          {Array.from({ length: columns }).map((_, columnIndex) => (
            <Skeleton
              key={columnIndex}
              width={columnIndex === 0 ? "80%" : "65%"}
              height="14px"
            />
          ))}
        </div>
      ))}
    </div>
  );
}
