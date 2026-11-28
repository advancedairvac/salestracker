"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Input from "@/components/ui/input";

const DATE_FILTERS = [
  { value: "TODAY", label: "TODAY" },
  { value: "TOMORROW", label: "TOMORROW" },
  { value: "NEXT_WEEK", label: "NEXT WEEK" },
  { value: "NEXT_MONTH", label: "NEXT MONTH" },
  { value: "BEYOND", label: "BEYOND" },
];

export default function PipelineFilter({
  users = [],
  selectedFilter = "ALL",
  basePath = "/admin/pipeline",
}) {
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

    router.push(`${basePath}?${params.toString()}`);
  }

  return (
    <Input
      as="select"
      variant="plain"
      value={selectedFilter}
      onChange={handleChange}
      aria-label="Filter pipeline"
      wrapperClassName="w-full sm:max-w-[320px]"
      className="!h-[46px] !min-h-[46px] !px-3 !py-0 !pr-10 !text-sm !font-normal !uppercase !text-[#333] focus:!border-black"
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
    </Input>
  );
}
