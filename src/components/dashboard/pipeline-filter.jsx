"use client";

import { useRouter, useSearchParams } from "next/navigation";

const DATE_FILTERS = [
  { value: "TODAY", label: "TODAY" },
  { value: "TOMORROW", label: "TOMORROW" },
  { value: "NEXT_WEEK", label: "NEXT WEEK" },
  { value: "NEXT_MONTH", label: "NEXT MONTH" },
  { value: "BEYOND", label: "BEYOND" },
];

export default function PipelineFilter({ users = [], selectedFilter = "ALL" }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(event) {
    const value = event.target.value;

    const params = new URLSearchParams(searchParams.toString());

    if (value === "ALL") {
      params.delete("filter");
    } else {
      params.set("filter", value);
    }

    // Start from the first page after changing filters.
    params.set("page", "1");

    // Keep the selected page size.
    if (!params.has("pageSize")) {
      params.set("pageSize", "10");
    }

    router.push(`/admin/pipeline?${params.toString()}`);
  }

  return (
    <div className="w-full sm:max-w-[320px]">
      <select
        value={selectedFilter}
        onChange={handleChange}
        aria-label="Filter pipeline"
        className="h-[46px] w-full appearance-none border border-[#d5d5d5] bg-white px-3 pr-10 text-sm font-normal uppercase text-[#333] outline-none focus:border-black"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23555555' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 12px center",
        }}
      >
        <option value="ALL">ALL</option>

        <optgroup label="TEAM MEMBERS">
          {users.map((user) => (
            <option key={user.id} value={`USER:${user.id}`}>
              {user.name}
            </option>
          ))}
        </optgroup>

        <optgroup label="FOLLOW-UP DATE">
          {DATE_FILTERS.map((filter) => (
            <option key={filter.value} value={filter.value}>
              {filter.label}
            </option>
          ))}
        </optgroup>
      </select>
    </div>
  );
}
