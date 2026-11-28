import { getJobType } from "@/lib/integrations/servicetitan";

const LOOKUP_CONCURRENCY = 10;

function getJobTypeName(result) {
  return result?.name || result?.jobType?.name || result?.data?.name || "";
}

export async function getServiceTitanJobTypesByIds(jobTypeIds = []) {
  const uniqueIds = [
    ...new Set(
      jobTypeIds
        .filter((id) => id !== undefined && id !== null && id !== "")
        .map(String),
    ),
  ];
  const jobTypeLookup = new Map();
  let currentIndex = 0;

  async function worker() {
    while (currentIndex < uniqueIds.length) {
      const index = currentIndex;
      currentIndex += 1;
      const id = uniqueIds[index];

      const result = await getJobType(id);
      const name = getJobTypeName(result);
      if (name) jobTypeLookup.set(id, name);
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(LOOKUP_CONCURRENCY, uniqueIds.length) },
      () => worker(),
    ),
  );

  return jobTypeLookup;
}
