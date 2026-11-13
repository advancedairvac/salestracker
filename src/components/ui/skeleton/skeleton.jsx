
export default function Skeleton({
  className = "",
  width,
  height = "16px",
  circle = false,
}) {
  return (
    <span
      aria-hidden="true"
      className={[
        "block shrink-0 animate-pulse bg-neutral-200",
        circle ? "rounded-full" : "rounded-sm",
        className,
      ].join(" ")}
      style={{ width, height }}
    />
  );
}
