
import { resend } from "@/lib/email/resend";

// ============================================
// HELPERS
// ============================================

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getValue(row, keys, fallback = "—") {
  for (const key of keys) {
    const value = row?.[key];

    if (value !== undefined && value !== null && value !== "") {
      if (typeof value === "object" && value.name) {
        return value.name;
      }

      return value;
    }
  }

  return fallback;
}

function formatCurrency(value) {
  const amount = Number(value);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
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
    timeZone: "UTC",
  });
}

function getNumber(summary, keys, fallback = 0) {
  for (const key of keys) {
    if (summary?.[key] !== undefined && summary?.[key] !== null) {
      return Number(summary[key]) || 0;
    }
  }

  return fallback;
}

function getSectionTotal(rows, keys) {
  return rows.reduce((total, row) => {
    return total + (Number(getValue(row, keys, 0)) || 0);
  }, 0);
}

// ============================================
// EMAIL TABLE
// ============================================

function createTable(title, rows, columns) {
  if (!rows.length) {
    return `
      <tr>
        <td style="padding:24px 16px;text-align:center;color:#777777;font-size:13px;">
          No records available for this period.
        </td>
      </tr>
    `;
  }

  const header = columns
    .map(
      (column) => `
        <th align="left" style="padding:11px 10px;background:#f3f3f3;color:#555555;font-size:10px;font-weight:700;text-transform:uppercase;border-bottom:1px solid #e5e5e5;">
          ${escapeHtml(column.label)}
        </th>
      `,
    )
    .join("");

  const body = rows
    .map(
      (row) => `
        <tr>
          ${columns
            .map((column) => {
              const value = getValue(row, column.keys);

              const formatted =
                column.type === "currency"
                  ? formatCurrency(value)
                  : column.type === "date"
                    ? formatDate(value)
                    : value;

              return `
                <td style="padding:11px 10px;color:#333333;font-size:11px;border-bottom:1px solid #eeeeee;">
                  ${escapeHtml(formatted)}
                </td>
              `;
            })
            .join("")}
        </tr>
      `,
    )
    .join("");

  return `
    <tr>
      <td style="padding:25px 0 10px;">
        <h3 style="margin:0;color:#111111;font-size:15px;font-weight:700;">
          ${escapeHtml(title)}
        </h3>
      </td>
    </tr>
    <tr>
      <td style="padding:0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;width:100%;">
          <thead>
            <tr>${header}</tr>
          </thead>
          <tbody>${body}</tbody>
        </table>
      </td>
    </tr>
  `;
}

// ============================================
// REPORT EMAIL HTML
// ============================================

function createReportEmailHtml({
  report,
  reportType,
  salesmanName,
}) {
  const data = report.data || {};
  const summary = report.summary || {};

  const sales = data.sales || [];
  const opportunities = data.opportunities || [];
  const estimates = data.estimates || [];
  const commissions = data.commissions || [];

  const salesTotal = getNumber(
    summary,
    ["salesTotal", "totalSales", "totalRevenue", "revenue"],
    getSectionTotal(sales, ["total", "revenue", "amount"]),
  );

  const opportunityTotal = getNumber(
    summary,
    ["opportunityTotal", "totalOpportunityValue", "pipelineValue"],
    getSectionTotal(opportunities, ["value", "amount"]),
  );

  const estimateTotal = getNumber(
    summary,
    ["estimateTotal", "totalEstimateValue", "estimatesTotal"],
    getSectionTotal(estimates, ["subtotal", "total", "amount"]),
  );

  const commissionTotal = getNumber(
    summary,
    ["commissionTotal", "totalCommissions", "totalCommission"],
    getSectionTotal(commissions, ["commissionEstimate", "commission"]),
  );

  const startDate =
    report.filters?.startDate || report.dateRange?.startDate;

  const endDate =
    report.filters?.endDate || report.dateRange?.endDate;

  const summaryCards = [
    { label: "Total Sales", value: formatCurrency(salesTotal) },
    { label: "Opportunities", value: formatCurrency(opportunityTotal) },
    { label: "Estimates", value: formatCurrency(estimateTotal) },
    { label: "Commissions", value: formatCurrency(commissionTotal) },
  ];

  const summaryHtml = summaryCards
    .map(
      (card) => `
        <td width="50%" style="padding:6px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f6f6f6;border:1px solid #e8e8e8;">
            <tr>
              <td style="padding:15px;">
                <p style="margin:0 0 8px;color:#777777;font-size:10px;font-weight:700;text-transform:uppercase;">
                  ${escapeHtml(card.label)}
                </p>
                <p style="margin:0;color:#111111;font-size:19px;font-weight:700;">
                  ${escapeHtml(card.value)}
                </p>
              </td>
            </tr>
          </table>
        </td>
      `,
    )
    .join("");

  const sections = [];

  if (reportType === "ALL" || reportType === "SALES") {
    sections.push(
      createTable("Sales", sales, [
        { label: "Job #", keys: ["jobNumber", "jobId", "serviceTitanJobId"] },
        { label: "Customer", keys: ["customerName", "customer"] },
        { label: "Completed", keys: ["completedOn"], type: "date" },
        { label: "Salesperson", keys: ["salesmanName", "salespersonName"] },
        { label: "Revenue", keys: ["total", "revenue", "amount"], type: "currency" },
      ]),
    );
  }

  if (reportType === "ALL" || reportType === "OPPORTUNITIES") {
    sections.push(
      createTable("Opportunities", opportunities, [
        { label: "Date", keys: ["opportunityDate"], type: "date" },
        { label: "Customer", keys: ["customerName", "customer"] },
        { label: "Job Type", keys: ["jobType"] },
        { label: "Salesperson", keys: ["assignedToName", "salesmanName"] },
        { label: "Status", keys: ["status"] },
        { label: "Value", keys: ["value", "amount"], type: "currency" },
      ]),
    );
  }

  if (reportType === "ALL" || reportType === "ESTIMATES") {
    sections.push(
      createTable("Estimates", estimates, [
        { label: "Estimate #", keys: ["estimateNumber", "id", "estimateId"] },
        { label: "Customer", keys: ["customerName", "customer"] },
        { label: "Created", keys: ["createdOn"], type: "date" },
        { label: "Status", keys: ["status"] },
        { label: "Salesperson", keys: ["salesmanName", "assignedToName"] },
        { label: "Amount", keys: ["subtotal", "total", "amount"], type: "currency" },
      ]),
    );
  }

  if (reportType === "ALL" || reportType === "COMMISSIONS") {
    sections.push(
      createTable("Commissions", commissions, [
        { label: "Job #", keys: ["jobNumber", "jobId", "serviceTitanJobId"] },
        { label: "Customer", keys: ["customerName", "customer"] },
        { label: "Completed", keys: ["completedOn"], type: "date" },
        { label: "Salesperson", keys: ["salesmanName", "salespersonName"] },
        { label: "Revenue", keys: ["total", "revenue", "amount"], type: "currency" },
        { label: "Commission", keys: ["commissionEstimate", "commission"], type: "currency" },
      ]),
    );
  }

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Sales Report</title>
      </head>

      <body style="margin:0;padding:0;background:#f1f1f1;font-family:Arial,Helvetica,sans-serif;color:#111111;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f1f1f1;padding:25px 10px;">
          <tr>
            <td align="center">

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:800px;background:#ffffff;">

                <!-- Brand Header -->
                <tr>
                  <td style="padding:27px 30px;background:#111111;">
                    <p style="margin:0;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:1px;">
                      SALES TRACKER
                    </p>
                    <p style="margin:7px 0 0;color:#bdbdbd;font-size:11px;text-transform:uppercase;letter-spacing:1px;">
                      Business Performance Report
                    </p>
                  </td>
                </tr>

                <!-- Report Information -->
                <tr>
                  <td style="padding:30px 30px 20px;">
                    <h1 style="margin:0 0 10px;color:#111111;font-size:23px;">
                      ${escapeHtml(reportType)} Report
                    </h1>

                    <p style="margin:0;color:#666666;font-size:12px;line-height:1.8;">
                      Reporting Period: <strong>${escapeHtml(formatDate(startDate))} – ${escapeHtml(formatDate(endDate))}</strong>
                    </p>

                    <p style="margin:3px 0 0;color:#666666;font-size:12px;">
                      Salesperson: <strong>${escapeHtml(salesmanName || "All Salespeople")}</strong>
                    </p>
                  </td>
                </tr>

                <!-- Summary -->
                <tr>
                  <td style="padding:0 24px 15px;">
                    <h2 style="margin:0 6px 12px;color:#111111;font-size:15px;">
                      Performance Summary
                    </h2>

                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        ${summaryHtml}
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Data Tables -->
                <tr>
                  <td style="padding:0 30px 30px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      ${sections.join("")}
                    </table>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding:22px 30px;background:#111111;">
                    <p style="margin:0;color:#ffffff;font-size:12px;font-weight:700;">
                      SALES TRACKER
                    </p>

                    <p style="margin:8px 0 0;color:#bdbdbd;font-size:10px;line-height:1.7;">
                      This report was automatically generated by Sales Tracker.
                      Please contact your administrator if you have questions about this report.
                    </p>

                    <p style="margin:12px 0 0;color:#777777;font-size:10px;">
                      © ${new Date().getFullYear()} Sales Tracker. All rights reserved.
                    </p>
                  </td>
                </tr>

              </table>

            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

// ============================================
// SEND REPORT EMAIL
// ============================================

export async function sendReportEmail({
  recipientEmail,
  subject,
  report,
  reportType = "ALL",
  salesmanName = "All Salespeople",
}) {
  const recipient = recipientEmail?.trim();

  if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
    throw new Error("A valid recipient email is required.");
  }

  if (!report || typeof report !== "object" || !report.data) {
    throw new Error("Valid report data is required.");
  }

  const allowedTypes = [
    "ALL",
    "SALES",
    "OPPORTUNITIES",
    "ESTIMATES",
    "COMMISSIONS",
  ];

  const normalizedType = String(reportType).toUpperCase();

  if (!allowedTypes.includes(normalizedType)) {
    throw new Error("Invalid report type.");
  }

  const emailSubject =
    typeof subject === "string" && subject.trim()
      ? subject.trim()
      : `Sales Tracker - ${normalizedType} Report`;

  const from = process.env.RESEND_FROM_EMAIL?.trim();

  if (!from) {
    throw new Error("RESEND_FROM_EMAIL is missing.");
  }

  const html = createReportEmailHtml({
    report,
    reportType: normalizedType,
    salesmanName,
  });

  const plainText = [
    `${normalizedType} Report`,
    `Period: ${report.filters?.startDate || report.dateRange?.startDate} - ${report.filters?.endDate || report.dateRange?.endDate}`,
    `Salesperson: ${salesmanName}`,
    "",
    "Please view this email in an HTML-compatible email client to see the complete report.",
  ].join("\n");

  const { data, error } = await resend.emails.send({
    from,
    to: [recipient],
    subject: emailSubject,
    html,
    text: plainText,
  });

  if (error) {
    throw new Error(error.message || "Resend email delivery failed.");
  }

  if (!data?.id) {
    throw new Error("Resend did not return an email ID.");
  }

  return {
    success: true,
    providerMessageId: data.id,
  };
}
