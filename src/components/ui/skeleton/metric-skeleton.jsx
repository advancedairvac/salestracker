
import Skeleton from "./skeleton";

export default function MetricSkeleton({
  width = "48px",
  height = "16px",
  className = "",
}) {
  return (
    <Skeleton
      width={width}
      height={height}
      className={className}
    />
  );
}
