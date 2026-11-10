
import { prisma } from "@/lib/prisma";

import {
  getAllJobs,
  getAllServiceTitanCustomers,
  getJobType,
} from "@/lib/integrations/servicetitan";

import JobCardsList from "@/components/settings/sales-configuration/job-cards-list";

export const dynamic = "force-dynamic";

function getJobList(result) {
  if (Array.isArray(result)) return result;

  if (Array.isArray(result?.jobs)) return result.jobs;

  if (Array.isArray(result?.data)) return result.data;

  if (Array.isArray(result?.data?.jobs)) return result.data.jobs;

  return [];
}

function getCustomerList(result) {
  if (Array.isArray(result)) return result;

  if (Array.isArray(result?.customers)) return result.customers;

  if (Array.isArray(result?.data)) return result.data;

  return [];
}

function getCustomerName(customer) {
  if (!customer) return "—";

  const firstName = customer.firstName?.trim() || "";
  const lastName = customer.lastName?.trim() || "";

  const fullName = [firstName, lastName].filter(Boolean).join(" ");

  return (
    customer.pocName ||
    fullName ||
    customer.name ||
    customer.businessName ||
    "—"
  );
}

function getJobTypeName(result) {
  if (!result) return "";

  return result.name || result.jobType?.name || result.data?.name || "";
}

function getJobCity(job, customer) {
  // Use data already included in the fetched records.
  // No additional Customer or Location API requests.
  return (
    job.location?.city ||
    job.city ||
    job.locationName?.city ||
    customer?.city ||
    customer?.address?.city ||
    customer?.locations?.[0]?.city ||
    ""
  );
}

function getJobValue(job) {
  const value = Number(job.total ?? job.saleValue ?? 0);

  return Number.isFinite(value) ? value : 0;
}

function formatJob(job, customerMap, jobTypeMap, saleMap) {
  const jobId = String(job.id);

  const customerId = String(job.customerId || "");

  const customer = customerMap.get(customerId);

  const customerName =
    getCustomerName(customer) !== "—"
      ? getCustomerName(customer)
      : job.customerName || "—";

  const jobTypeName = jobTypeMap.get(String(job.jobTypeId)) || "";

  const city = getJobCity(job, customer);

  const jobNumber = String(job.jobNumber || job.id);

  const titleParts = [
    `Job #${jobNumber}:`,
    jobTypeName,
    city ? `in ${city}` : "",
  ].filter(Boolean);

  const existingSale = saleMap.get(jobId);

  return {
    serviceTitanJobId: jobId,
    jobNumber,

    title: titleParts.join(" "),

    customerName,

    saleValue: getJobValue(job),

    jobStatus: job.jobStatus || "",

    createdOn: job.createdOn || null,

    completedOn: job.completedOn || null,

    source: existingSale?.source || null,

    salesmanId: existingSale?.salesmanId || null,

    salesmanName: existingSale?.salesman?.name || null,
  };
}

export default async function SalesConfigurationPage() {
  let jobs = [];
  let salesmen = [];
  let errorMessage = "";

  try {
    // Fetch ServiceTitan Jobs, Customers and active Salespersons.
    const [jobsResult, customersResult, salesmenResult] = await Promise.all([
      getAllJobs({
        pageSize: 100,
        maxPages: 100,
      }),

      getAllServiceTitanCustomers({
        pageSize: 100,
        maxPages: 100,
      }),

      prisma.user.findMany({
        where: {
          role: "SALESPERSON",
          isActive: true,
        },
        select: {
          id: true,
          name: true,
        },
        orderBy: {
          name: "asc",
        },
      }),
    ]);

    const serviceTitanJobs = getJobList(jobsResult);

    const serviceTitanCustomers = getCustomerList(customersResult);

    salesmen = salesmenResult;

    // Customer lookup map.
    const customerMap = new Map(
      serviceTitanCustomers.map((customer) => [String(customer.id), customer]),
    );

    // Collect unique Job Type IDs.
    const jobTypeIds = [
      ...new Set(
        serviceTitanJobs
          .map((job) => job.jobTypeId)
          .filter(Boolean)
          .map(String),
      ),
    ];

    // Fetch each unique Job Type only once.
    const jobTypeResults = await Promise.all(
      jobTypeIds.map(async (jobTypeId) => {
        const result = await getJobType(jobTypeId);

        return [jobTypeId, getJobTypeName(result)];
      }),
    );

    const jobTypeMap = new Map(jobTypeResults);

    // Fetch saved CRM assignments.
    const savedSales = await prisma.sale.findMany({
      select: {
        serviceTitanJobId: true,
        source: true,
        salesmanId: true,
        salesman: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const saleMap = new Map(
      savedSales.map((sale) => [String(sale.serviceTitanJobId), sale]),
    );

    // Format all valid ServiceTitan Jobs.
    jobs = serviceTitanJobs
      .filter(
        (job) =>
          job.id !== undefined && job.id !== null && getJobValue(job) > 0,
      )
      .map((job) => formatJob(job, customerMap, jobTypeMap, saleMap))
      // Latest created Jobs first.
      .sort((a, b) => {
        const dateA = a.createdOn ? new Date(a.createdOn).getTime() : 0;

        const dateB = b.createdOn ? new Date(b.createdOn).getTime() : 0;

        return dateB - dateA;
      });
  } catch (error) {
    console.error("Sales Configuration Page Error:", error);

    errorMessage = "Unable to load ServiceTitan Jobs. Please try again later.";
  }

  return (
    <div className="w-full space-y-6">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#929292]">
            Settings
          </p>

          <h1 className="mt-1 text-[23px] font-extrabold uppercase tracking-wide text-[#171717]">
            Sales Configuration
          </h1>

          <p className="mt-1 text-[13px] text-[#737373]">
            Manage job sources and salesperson assignments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[12px] text-[#737373]">Total Jobs</span>

          <span className="flex h-8 min-w-8 items-center justify-center rounded-md border border-[#d5d5d5] bg-white px-2 text-[13px] font-bold text-[#171717]">
            {jobs.length}
          </span>
        </div>
      </div>

      {/* Error */}
      {errorMessage && (
        <div className="border border-red-200 bg-red-50 p-4 text-[13px] text-red-700">
          {errorMessage}
        </div>
      )}

      {/* Empty State */}
      {!errorMessage && jobs.length === 0 && (
        <div className="border border-[#d5d5d5] bg-white px-5 py-12 text-center">
          <h2 className="text-[15px] font-bold uppercase tracking-wide text-[#171717]">
            No Jobs Found
          </h2>

          <p className="mt-2 text-[13px] text-[#737373]">
            No ServiceTitan Jobs with a value greater than zero are currently
            available.
          </p>
        </div>
      )}

      {/* Job Cards with Pagination */}
      {jobs.length > 0 && (
        <JobCardsList jobs={jobs} salesmen={salesmen} />
      )}
    </div>
  );
}
