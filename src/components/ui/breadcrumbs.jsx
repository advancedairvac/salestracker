/**
<Breadcrumbs
  items={[
    { label: "Sales Tracker", href: "/admin" },
    { label: "Pipeline", href: "/admin/pipeline" },
  ]}
  currentPage="Opportunity"
/>
 */


import Link from "next/link";

export default function Breadcrumbs({
  items = [],
  currentPage,
}) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex flex-wrap items-center gap-x-2 text-xs sm:text-lg "
    >
      {items.map((item, index) => (
        <span
          key={`${item.href}-${item.label}`}
          className="inline-flex items-center gap-x-2"
        >
          <Link
            href={item.href}
            className="font-medium text-neutral-950 transition-colors hover:text-neutral-600"
          >
            {item.label}
          </Link>

          <span aria-hidden="true" className="text-neutral-950">
            /
          </span>
        </span>
      ))}

      <span
        aria-current="page"
        className="font-medium text-neutral-600"
      >
        {currentPage}
      </span>
    </nav>
  );
}
