
"use server";

import { getAuthenticatedUser } from "@/lib/auth";
import { getReportData } from "@/lib/dashboard/report-data";

// ============================================
// GENERATE REPORT
// ============================================

export async function generateReportAction({
  startDate,
  endDate,
  reportType = "ALL",
  salesmanId = "ALL",
} = {}) {
  try {
    // ============================================
    // AUTHENTICATION
    // ============================================

    const user = await getAuthenticatedUser();

    if (!user || !user.isActive) {
      return {
        success: false,
        message: "Your session has expired. Please log in again.",
      };
    }

    if (!["ADMIN", "SALESPERSON"].includes(user.role)) {
      return {
        success: false,
        message: "You are not authorized to generate reports.",
      };
    }

    // ============================================
    // INPUT VALIDATION
    // ============================================

    if (!startDate || !endDate) {
      return {
        success: false,
        message: "Please select a valid date range.",
      };
    }

    if (
      typeof startDate !== "string" ||
      typeof endDate !== "string"
    ) {
      return {
        success: false,
        message: "Invalid date range.",
      };
    }

    const normalizedReportType = String(reportType).toUpperCase();

    const allowedReportTypes = [
      "ALL",
      "SALES",
      "OPPORTUNITIES",
      "ESTIMATES",
      "COMMISSIONS",
    ];

    if (!allowedReportTypes.includes(normalizedReportType)) {
      return {
        success: false,
        message: "Invalid report type.",
      };
    }

    // ============================================
    // SALESPERSON ACCESS CONTROL
    // ============================================

    // Salespeople can only generate their own reports.
    // Ignore any salesmanId submitted by the browser.

    const requestedSalesmanId =
      user.role === "ADMIN"
        ? salesmanId || "ALL"
        : user.id;

    // ============================================
    // GENERATE REPORT
    // ============================================

    const report = await getReportData({
      startDate,
      endDate,
      reportType: normalizedReportType,
      salesmanId: requestedSalesmanId,
    });

    return {
      success: true,
      report,
    };
  } catch (error) {
    console.error("[Generate Report Error]", error);

    return {
      success: false,
      message:
        error?.message ||
        "Unable to generate the report. Please try again.",
    };
  }
}
