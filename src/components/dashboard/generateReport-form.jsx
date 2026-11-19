
"use client";

import { useState } from "react";

import DateSelector from "@/components/ui/date-selector";
import SvgIcon from "@/components/icons/svg-icons";

import { generateReportAction } from "@/app/actions/report-actions";
import { sendReportEmailAction } from "@/app/actions/report-email-actions";

// ============================================
// REPORT TYPES
// ============================================

const REPORT_TYPES = [
  { value: "ALL", label: "ALL" },
  { value: "SALES", label: "SALES" },
  { value: "OPPORTUNITIES", label: "OPPORTUNITIES" },
  { value: "ESTIMATES", label: "ESTIMATES" },
  { value: "COMMISSIONS", label: "COMMISSIONS" },
];

// ============================================
// REPORT TABLE CONFIGURATION
// ============================================

const REPORT_SECTIONS = [
  {
    key: "sales",
    title: "Sales",
    columns: [
      {
        label: "JOB #",
        keys: ["jobNumber", "jobId", "serviceTitanJobId"],
      },
      {
        label: "CUSTOMER",
        keys: ["customerName", "customer"],
      },
      {
        label: "COMPLETED",
        keys: ["completedOn"],
        type: "date",
      },
      {
        label: "JOB TYPE",
        keys: ["jobType", "jobTypeName", "jobTypeId"],
      },
      {
        label: "SALESPERSON",
        keys: ["salesmanName", "salespersonName"],
      },
      {
        label: "REVENUE",
        keys: ["total", "revenue", "amount"],
        type: "currency",
      },
    ],
  },
  {
    key: "opportunities",
    title: "Opportunities",
    columns: [
      {
        label: "DATE",
        keys: ["opportunityDate"],
        type: "date",
      },
      {
        label: "CUSTOMER",
        keys: ["customerName", "customer"],
      },
      {
        label: "JOB TYPE",
        keys: ["jobType"],
      },
      {
        label: "SALESPERSON",
        keys: ["assignedToName", "salesmanName"],
      },
      {
        label: "SOURCE",
        keys: ["source"],
      },
      {
        label: "STATUS",
        keys: ["status"],
      },
      {
        label: "VALUE",
        keys: ["value", "amount"],
        type: "currency",
      },
    ],
  },
  {
    key: "estimates",
    title: "Estimates",
    columns: [
      {
        label: "ESTIMATE #",
        keys: ["estimateNumber", "id", "estimateId"],
      },
      {
        label: "CUSTOMER",
        keys: ["customerName", "customer"],
      },
      {
        label: "CREATED",
        keys: ["createdOn"],
        type: "date",
      },
      {
        label: "STATUS",
        keys: ["status"],
      },
      {
        label: "SALESPERSON",
        keys: ["salesmanName", "assignedToName"],
      },
      {
        label: "AMOUNT",
        keys: ["subtotal", "total", "amount"],
        type: "currency",
      },
    ],
  },
  {
    key: "commissions",
    title: "Commissions",
    columns: [
      {
        label: "JOB #",
        keys: ["jobNumber", "jobId", "serviceTitanJobId"],
      },
      {
        label: "CUSTOMER",
        keys: ["customerName", "customer"],
      },
      {
        label: "COMPLETED",
        keys: ["completedOn"],
        type: "date",
      },
      {
        label: "SALESPERSON",
        keys: ["salesmanName", "salespersonName"],
      },
      {
        label: "REVENUE",
        keys: ["total", "revenue", "amount"],
        type: "currency",
      },
      {
        label: "COMMISSION",
        keys: ["commissionEstimate", "commission"],
        type: "currency",
      },
    ],
  },
];

// ============================================
// DATE HELPERS
// ============================================

function getCurrentMonthRange() {
  const now = new Date();

  const pad = (value) => String(value).padStart(2, "0");

  return {
    startDate: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`,
    endDate: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
  };
}

// ============================================
// GENERAL HELPERS
// ============================================

function getValue(row, keys = [], fallback = "—") {
  for (const key of keys) {
    const value = row?.[key];

    if (value === undefined || value === null || value === "") {
      continue;
    }

    if (typeof value === "object") {
      if (value.name) return value.name;
      if (value.value !== undefined) return value.value;
    }

    return value;
  }

  return fallback;
}

function toNumber(value) {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

function formatDate(value) {
  if (!value || value === "—") return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function formatCellValue(row, column) {
  const value = getValue(row, column.keys);

  if (column.type === "currency") {
    return formatCurrency(value);
  }

  if (column.type === "date") {
    return formatDate(value);
  }

  return String(value);
}

function getSectionTotal(rows, keys) {
  return rows.reduce((total, row) => {
    return total + toNumber(getValue(row, keys, 0));
  }, 0);
}

function getSummaryMetric(summary, keys, fallback = 0) {
  for (const key of keys) {
    if (summary?.[key] !== undefined && summary?.[key] !== null) {
      return toNumber(summary[key]);
    }
  }

  return fallback;
}

function getVisibleSections(reportType, report) {
  if (!report?.data) return [];

  return REPORT_SECTIONS.filter((section) => {
    const isAvailable = Array.isArray(report.data[section.key]);

    if (!isAvailable) return false;

    return (
      reportType === "ALL" ||
      section.key.toUpperCase() === reportType
    );
  }).map((section) => ({
    ...section,
    rows: report.data[section.key] || [],
  }));
}

// ============================================
// SHARED FORM STYLES
// ============================================

const selectClass = [
  "peer h-[50px] w-full appearance-none rounded-none",
  "border border-[#d9d9d9] bg-white",
  "px-3 pt-[15px] pb-[4px] pr-10",
  "text-xs font-normal outline-none transition-colors",
  "focus:border-[#111111]",
].join(" ");

const labelBase = [
  "pointer-events-none absolute left-3 z-[1]",
  "font-medium uppercase tracking-[0.02em]",
  "text-[#565656] transition-all duration-150",
].join(" ");

// ============================================
// FLOATING SELECT
// ============================================

function FloatingSelect({
  name,
  label,
  value = "",
  onChange,
  options = [],
  required = false,
}) {
  const [focused, setFocused] = useState(false);

  const floating = focused || value !== "";

  return (
    <div className="relative w-full">
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        required={required}
        className={[
          selectClass,
          floating ? "text-[#111111]" : "text-transparent",
        ].join(" ")}
      >
        <option value="" disabled hidden />

        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <label
        htmlFor={name}
        className={`${labelBase} ${
          floating
            ? "top-[6px] text-[10px]"
            : "top-1/2 -translate-y-1/2 text-[10px]"
        }`}
      >
        {label}

        {required && (
          <span className="ml-1 text-red-600" aria-hidden="true">
            *
          </span>
        )}
      </label>

      <SvgIcon
        name="chevronDown"
        className={[
          "pointer-events-none absolute right-3 top-1/2",
          "h-4 w-4 -translate-y-1/2 shrink-0",
          "text-[#555555]",
        ].join(" ")}
      />
    </div>
  );
}

// ============================================
// SUMMARY CARD
// ============================================

function SummaryCard({ label, value, description }) {
  return (
    <div className="border border-[#e2e2e2] bg-white p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[#777777]">
        {label}
      </p>

      <p className="mt-2 text-xl font-semibold tracking-tight text-[#111111]">
        {value}
      </p>

      {description && (
        <p className="mt-1 text-[10px] text-[#888888]">
          {description}
        </p>
      )}
    </div>
  );
}

// ============================================
// REPORT TABLE
// ============================================

function ReportTable({ section }) {
  const { columns, rows } = section;

  return (
    <div className="overflow-hidden border border-[#e2e2e2] bg-white">
      <div className="flex items-center justify-between border-b border-[#e2e2e2] px-4 py-3">
        <h3 className="text-xs font-semibold uppercase tracking-[0.04em] text-[#111111]">
          {section.title}
        </h3>

        <span className="text-[10px] text-[#777777]">
          {rows.length} {rows.length === 1 ? "record" : "records"}
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="px-4 py-8 text-center text-xs text-[#777777]">
          No {section.title.toLowerCase()} found for this date range.
        </p>
      ) : (
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[650px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[#e5e5e5] bg-[#f8f8f8]">
                {columns.map((column) => (
                  <th
                    key={column.label}
                    className="whitespace-nowrap px-4 py-3 text-[9px] font-semibold tracking-[0.04em] text-[#666666]"
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rows.map((row, index) => (
                <tr
                  key={
                    row.id ||
                    row.jobId ||
                    row.estimateId ||
                    row.serviceTitanJobId ||
                    index
                  }
                  className="border-b border-[#eeeeee] last:border-b-0"
                >
                  {columns.map((column) => (
                    <td
                      key={column.label}
                      className="whitespace-nowrap px-4 py-3 text-[11px] text-[#333333]"
                    >
                      {formatCellValue(row, column)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============================================
// PDF DOWNLOAD
// ============================================

async function downloadPDF(report, sections, reportType) {
  const { default: jsPDF } = await import("jspdf");

  const autoTableModule = await import("jspdf-autotable");

  const autoTable =
    autoTableModule.default || autoTableModule.autoTable;

  if (!autoTable) {
    throw new Error("PDF table generator is unavailable.");
  }

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const startDate =
    report.filters?.startDate || report.dateRange?.startDate;

  const endDate =
    report.filters?.endDate || report.dateRange?.endDate;

  doc.setFontSize(18);
  doc.setTextColor(17, 17, 17);
  doc.text("Sales Tracker Report", 14, 18);

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);

  doc.text(`${reportType} Report`, 14, 25);

  doc.text(
    `Period: ${formatDate(startDate)} - ${formatDate(endDate)}`,
    14,
    31,
  );

  let currentY = 40;

  for (const section of sections) {
    doc.setFontSize(12);
    doc.setTextColor(17, 17, 17);

    if (currentY > 175) {
      doc.addPage();
      currentY = 18;
    }

    doc.text(section.title, 14, currentY);

    const head = [
      section.columns.map((column) => column.label),
    ];

    const body = section.rows.map((row) =>
      section.columns.map((column) => formatCellValue(row, column)),
    );

    autoTable(doc, {
      startY: currentY + 4,
      head,
      body,
      theme: "grid",
      styles: {
        fontSize: 7,
        cellPadding: 2,
        overflow: "linebreak",
      },
      headStyles: {
        fillColor: [20, 20, 20],
        textColor: [255, 255, 255],
      },
      margin: {
        left: 14,
        right: 14,
      },
    });

    currentY = (doc.lastAutoTable?.finalY || currentY + 10) + 12;
  }

  doc.save(
    `sales-report-${startDate || "report"}-${endDate || ""}.pdf`,
  );
}

// ============================================
// EXCEL DOWNLOAD
// ============================================

async function downloadExcel(report, sections) {
  const XLSX = await import("xlsx");

  const workbook = XLSX.utils.book_new();

  for (const section of sections) {
    const rows = section.rows.map((row) => {
      const formattedRow = {};

      section.columns.forEach((column) => {
        const value = getValue(row, column.keys);

        formattedRow[column.label] =
          column.type === "currency"
            ? toNumber(value)
            : column.type === "date"
              ? formatDate(value)
              : String(value);
      });

      return formattedRow;
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      section.title.slice(0, 31),
    );
  }

  if (sections.length === 0) {
    const worksheet = XLSX.utils.aoa_to_sheet([
      ["No report data available"],
    ]);

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Report",
    );
  }

  const startDate =
    report.filters?.startDate || report.dateRange?.startDate;

  const endDate =
    report.filters?.endDate || report.dateRange?.endDate;

  XLSX.writeFile(
    workbook,
    `sales-report-${startDate || "report"}-${endDate || ""}.xlsx`,
  );
}

// ============================================
// GENERATE REPORT FORM
// ============================================

export default function GenerateReportForm({
  users = [],
  isSalesperson = false,
  currentUserName = "",
}) {
  // ----------------------------------------
  // REPORT FILTER STATES
  // ----------------------------------------

  const [dateRange, setDateRange] = useState(getCurrentMonthRange);
  const [reportType, setReportType] = useState("ALL");
  const [salesmanId, setSalesmanId] = useState("ALL");

  // ----------------------------------------
  // REPORT STATES
  // ----------------------------------------

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // ----------------------------------------
  // EMAIL STATES
  // ----------------------------------------

  const [recipientEmail, setRecipientEmail] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailMessage, setEmailMessage] = useState("");

  // ----------------------------------------
  // DOWNLOAD STATES
  // ----------------------------------------

  const [downloading, setDownloading] = useState("");

  // ============================================
  // SALESPERSON OPTIONS
  // ============================================

  const activeSalespeople = users.filter(
    (user) =>
      user.role === "SALESPERSON" &&
      user.isActive !== false,
  );

  const salesmanOptions = [
    {
      value: "ALL",
      label: "ALL SALESMEN",
    },
    ...activeSalespeople.map((user) => ({
      value: user.id,
      label: user.name,
    })),
  ];

  // ============================================
  // HANDLE GENERATE REPORT
  // ============================================

  async function handleSubmit(event) {
    event.preventDefault();

    setMessage("");
    setEmailMessage("");
    setReport(null);

    if (!dateRange?.startDate || !dateRange?.endDate) {
      setMessage("Please select a valid date range.");
      return;
    }

    if (dateRange.startDate > dateRange.endDate) {
      setMessage("Start date cannot be after end date.");
      return;
    }

    if (!reportType) {
      setMessage("Please select a report type.");
      return;
    }

    if (!isSalesperson && !salesmanId) {
      setMessage("Please select a salesperson.");
      return;
    }

    setLoading(true);

    try {
      const result = await generateReportAction({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        reportType,
        salesmanId: isSalesperson ? "ALL" : salesmanId,
      });

      if (!result?.success) {
        setMessage(
          result?.message || "Unable to generate the report.",
        );

        return;
      }

      setReport(result.report);
    } catch (error) {
      console.error("[Generate Report Form]", error);

      setMessage(
        "Something went wrong while generating the report.",
      );
    } finally {
      setLoading(false);
    }
  }

  // ============================================
  // HANDLE PDF / EXCEL DOWNLOAD
  // ============================================

  async function handleDownload(type) {
    if (!report) return;

    const sections = getVisibleSections(reportType, report);

    setDownloading(type);
    setMessage("");

    try {
      if (type === "PDF") {
        await downloadPDF(report, sections, reportType);
      } else {
        await downloadExcel(report, sections);
      }
    } catch (error) {
      console.error(`[${type} Report Download Error]`, error);

      setMessage(
        `Unable to download the ${type} report. Please try again.`,
      );
    } finally {
      setDownloading("");
    }
  }

  // ============================================
  // HANDLE EMAIL REPORT
  // ============================================

  async function handleSendReportEmail(event) {
    event.preventDefault();

    setEmailMessage("");

    if (!report) {
      setEmailMessage("Please generate a report first.");
      return;
    }

    if (!recipientEmail.trim()) {
      setEmailMessage("Please enter a recipient email address.");
      return;
    }

    setEmailSending(true);

    try {
      const result = await sendReportEmailAction({
        recipientEmail: recipientEmail.trim(),
        subject: emailSubject.trim(),
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        reportType,
        salesmanId: isSalesperson ? "ALL" : salesmanId,
      });

      if (!result?.success) {
        setEmailMessage(
          result?.message || "Unable to send the report email.",
        );

        return;
      }

      setEmailMessage(
        result.message || "Report email sent successfully.",
      );

      setEmailSubject("");
    } catch (error) {
      console.error("[Report Email Error]", error);

      setEmailMessage(
        "Something went wrong while sending the email.",
      );
    } finally {
      setEmailSending(false);
    }
  }

  // ============================================
  // REPORT DATA
  // ============================================

  const sections = report
    ? getVisibleSections(reportType, report)
    : [];

  const salesRows = report?.data?.sales || [];
  const opportunityRows = report?.data?.opportunities || [];
  const estimateRows = report?.data?.estimates || [];
  const commissionRows = report?.data?.commissions || [];

  const summary = report?.summary || {};

  const salesTotal = getSummaryMetric(
    summary,
    ["salesTotal", "totalSales", "totalRevenue", "revenue"],
    getSectionTotal(salesRows, ["total", "revenue", "amount"]),
  );

  const opportunityTotal = getSummaryMetric(
    summary,
    [
      "opportunityTotal",
      "totalOpportunityValue",
      "pipelineValue",
    ],
    getSectionTotal(opportunityRows, ["value", "amount"]),
  );

  const estimateTotal = getSummaryMetric(
    summary,
    [
      "estimateTotal",
      "totalEstimateValue",
      "estimatesTotal",
    ],
    getSectionTotal(estimateRows, ["subtotal", "total", "amount"]),
  );

  const commissionTotal = getSummaryMetric(
    summary,
    [
      "commissionTotal",
      "totalCommissions",
      "totalCommission",
    ],
    getSectionTotal(commissionRows, [
      "commissionEstimate",
      "commission",
    ]),
  );

  const summaryCards = [
    {
      label: "Total Sales",
      value: formatCurrency(salesTotal),
      description: `${salesRows.length} completed jobs`,
    },
    {
      label: "Opportunities",
      value: formatCurrency(opportunityTotal),
      description: `${opportunityRows.length} opportunities`,
    },
    {
      label: "Estimates",
      value: formatCurrency(estimateTotal),
      description: `${estimateRows.length} estimates`,
    },
    {
      label: "Commissions",
      value: formatCurrency(commissionTotal),
      description: `${commissionRows.length} completed jobs`,
    },
  ];

  // ============================================
  // RENDER
  // ============================================

  return (
    <section className="w-full">
      {/* ========================================
          REPORT FILTER FORM
      ======================================== */}

      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-[700px] flex-col gap-[9px]"
      >
        {/* Date Range */}

        <DateSelector
          value={dateRange || undefined}
          onChange={(range) => {
            setDateRange(range);
            setMessage("");
            setEmailMessage("");
            setReport(null);
          }}
          className="[&>div>button]:!h-[48px] [&>div>button]:!min-h-[48px]"
          compact
        />

        {/* Report Type */}

        <FloatingSelect
          name="type"
          label="TYPE"
          value={reportType}
          onChange={(event) => {
            setReportType(event.target.value);
            setMessage("");
            setEmailMessage("");
            setReport(null);
          }}
          options={REPORT_TYPES}
          required
        />

        {/* Salesperson Filter */}

        {!isSalesperson ? (
          <FloatingSelect
            name="salesmanId"
            label="SALESPERSON"
            value={salesmanId}
            onChange={(event) => {
              setSalesmanId(event.target.value);
              setMessage("");
              setEmailMessage("");
              setReport(null);
            }}
            options={salesmanOptions}
          />
        ) : (
          <div className="flex h-[48px] items-center border border-[#d9d9d9] px-3">
            <span className="text-[10px] font-medium uppercase tracking-[0.03em] text-[#777777]">
              SALESPERSON:
            </span>

            <span className="ml-2 text-xs font-medium text-[#111111]">
              {currentUserName || "My Report"}
            </span>
          </div>
        )}

        {/* Hidden Date Values */}

        <input
          type="hidden"
          name="startDate"
          value={dateRange?.startDate || ""}
        />

        <input
          type="hidden"
          name="endDate"
          value={dateRange?.endDate || ""}
        />

        {/* Generate Button */}

        <button
          type="submit"
          disabled={loading}
          className={[
            "mt-0 flex h-[48px] w-full items-center justify-center gap-2",
            "rounded-none border border-[#111111]",
            "bg-[#111111] px-4",
            "text-xs font-semibold uppercase tracking-[0.03em] text-white",
            "transition-colors hover:bg-[#333333]",
            "focus-visible:outline-none focus-visible:ring-2",
            "focus-visible:ring-black focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-60",
          ].join(" ")}
        >
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Generating...
            </>
          ) : (
            "Generate"
          )}
        </button>

        {/* Feedback Message */}

        {message && (
          <p
            role="alert"
            className={[
              "border border-[#d5d5d5]",
              "bg-[#fafafa] px-3 py-3",
              "text-xs leading-5 text-[#555555]",
            ].join(" ")}
          >
            {message}
          </p>
        )}
      </form>

      {/* ========================================
          REPORT OUTPUT
      ======================================== */}

      {report && (
        <div className="mt-8 w-full">
          {/* Report Header */}

          <div className="flex flex-col gap-4 border-b border-[#dedede] pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#777777]">
                Generated Report
              </p>

              <h2 className="mt-1 text-xl font-semibold uppercase tracking-tight text-[#111111]">
                {reportType} Report
              </h2>

              <p className="mt-1 text-xs text-[#777777]">
                {formatDate(dateRange.startDate)} —{" "}
                {formatDate(dateRange.endDate)}
              </p>
            </div>

            {/* Download Buttons */}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleDownload("PDF")}
                disabled={Boolean(downloading)}
                className="flex h-10 items-center gap-2 border border-[#111111] bg-white px-4 text-[10px] font-semibold uppercase tracking-[0.03em] text-[#111111] transition-colors hover:bg-[#f5f5f5] disabled:opacity-50"
              >
                <SvgIcon
                  name="download"
                  className="h-4 w-4"
                />

                {downloading === "PDF" ? "Preparing..." : "PDF"}
              </button>

              <button
                type="button"
                onClick={() => handleDownload("EXCEL")}
                disabled={Boolean(downloading)}
                className="flex h-10 items-center gap-2 border border-[#111111] bg-[#111111] px-4 text-[10px] font-semibold uppercase tracking-[0.03em] text-white transition-colors hover:bg-[#333333] disabled:opacity-50"
              >
                <SvgIcon
                  name="download"
                  className="h-4 w-4"
                />

                {downloading === "EXCEL"
                  ? "Preparing..."
                  : "Excel"}
              </button>
            </div>
          </div>

          {/* Summary Cards */}

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => (
              <SummaryCard
                key={card.label}
                label={card.label}
                value={card.value}
                description={card.description}
              />
            ))}
          </div>

          {/* Report Tables */}

          <div className="mt-6 flex flex-col gap-6">
            {sections.map((section) => (
              <ReportTable
                key={section.key}
                section={section}
              />
            ))}

            {sections.length === 0 && (
              <div className="border border-[#e2e2e2] px-4 py-10 text-center">
                <p className="text-xs text-[#777777]">
                  No report sections are available for this selection.
                </p>
              </div>
            )}
          </div>

          {/* ========================================
              EMAIL REPORT
          ======================================== */}

          <div className="mt-6 border border-[#e2e2e2] bg-white p-5">
            <div className="mb-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.03em] text-[#111111]">
                Share Report via Email
              </h3>

              <p className="mt-1 text-xs leading-5 text-[#777777]">
                Send this report directly to an email address.
              </p>
            </div>

            <form
              onSubmit={handleSendReportEmail}
              className="flex flex-col gap-3"
            >
              {/* Recipient Email */}

              <div>
                <label
                  htmlFor="reportRecipientEmail"
                  className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.04em] text-[#555555]"
                >
                  Recipient Email
                </label>

                <input
                  id="reportRecipientEmail"
                  type="email"
                  value={recipientEmail}
                  onChange={(event) => {
                    setRecipientEmail(event.target.value);
                    setEmailMessage("");
                  }}
                  placeholder="Enter recipient email address"
                  required
                  className="h-[46px] w-full rounded-none border border-[#d9d9d9] px-3 text-xs text-[#111111] outline-none transition-colors focus:border-[#111111]"
                />
              </div>

              {/* Email Subject */}

              <div>
                <label
                  htmlFor="reportEmailSubject"
                  className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.04em] text-[#555555]"
                >
                  Email Subject

                  <span className="ml-1 font-normal normal-case text-[#999999]">
                    (Optional)
                  </span>
                </label>

                <input
                  id="reportEmailSubject"
                  type="text"
                  value={emailSubject}
                  onChange={(event) =>
                    setEmailSubject(event.target.value)
                  }
                  placeholder="Sales Tracker Report"
                  maxLength={150}
                  className="h-[46px] w-full rounded-none border border-[#d9d9d9] px-3 text-xs text-[#111111] outline-none transition-colors focus:border-[#111111]"
                />
              </div>

              {/* Send Email Button */}

              <button
                type="submit"
                disabled={emailSending}
                className={[
                  "flex h-[46px] w-full items-center justify-center gap-2",
                  "border border-[#111111] bg-[#111111] px-4",
                  "text-xs font-semibold uppercase tracking-[0.03em] text-white",
                  "transition-colors hover:bg-[#333333]",
                  "disabled:cursor-not-allowed disabled:opacity-60",
                ].join(" ")}
              >
                {emailSending ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Sending...
                  </>
                ) : (
                  <>
                    <SvgIcon
                      name="mail"
                      className="h-4 w-4"
                    />
                    Send Report
                  </>
                )}
              </button>

              {/* Email Feedback */}

              {emailMessage && (
                <p
                  role="status"
                  className="border border-[#e2e2e2] bg-[#fafafa] px-3 py-3 text-xs leading-5 text-[#555555]"
                >
                  {emailMessage}
                </p>
              )}
            </form>
          </div>

          {/* Report Footer */}

          <div className="mt-5 border-t border-[#e2e2e2] pt-3">
            <p className="text-[10px] text-[#888888]">
              Generated on{" "}
              {formatDate(report.generatedAt || new Date())}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
