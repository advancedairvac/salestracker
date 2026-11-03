export default function Skeleton({
  className = "",
  width,
  height,
  rounded = "sm",
}) {
  const radiusClasses = {
    none: "rounded-none",
    sm: "rounded-sm",
    md: "rounded-md",
    full: "rounded-full",
  };

  return (
    <div
      aria-hidden="true"
      className={[
        "animate-pulse bg-neutral-200",
        radiusClasses[rounded] || radiusClasses.sm,
        className,
      ].join(" ")}
      style={{
        width,
        height,
      }}
    />
  );
}