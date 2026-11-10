
import Link from "next/link";

export default function AdminSettingsCta({
  title,
  description,
  href,
  className = "",
}) {
  return (
    <Link
      href={href}
      className={`group block w-full border border-[#d5d5d5] bg-white p-4 transition-colors hover:border-[#777] sm:p-[18px] ${className}`}
    >
      {/* CARD HEADER */}

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-extrabold uppercase leading-tight tracking-[-0.3px] text-black sm:text-[17px]">
          {title}
        </h2>

        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="h-6 w-6 shrink-0 text-[#555] transition-transform duration-200 group-hover:translate-x-1"
          aria-hidden="true"
        >
          <path
            d="M9 5L16 12L9 19"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* CARD DESCRIPTION */}

      <p className="mt-3 text-sm leading-relaxed text-[#777]">
        {description}
      </p>

      {/* CARD FOOTER */}

      <div className="mt-6">
        <span className="text-[11px] font-medium uppercase tracking-wide text-[#555]">
          Manage Settings
        </span>
      </div>
    </Link>
  );
}
