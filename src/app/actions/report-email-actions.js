"use server";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { getReportData } from "@/lib/dashboard/report-data";
import { sendReportEmail } from "@/lib/email/send-report-email";

// ============================================
// SEND REPORT EMAIL ACTION
// ============================================

export async function sendReportEmailAction({
  recipientEmail,
  subject = "",
  startDate,
  endDate,
  reportType = "ALL",
  salesmanId = "ALL",
} = {}) {
  try {
    // ----------------------------------------
    // Authentication
    // ----------------------------------------

    const user = await getAuthenticatedUser();

    if (!user || user.status !== "ACTIVE") {
      return {
        success: false,
        message: "Your session has expired. Please log in again.",
      };
    }

    if (!["ADMIN", "SALESPERSON"].includes(user.role)) {
      return {
        success: false,
        message: "You are not authorized to email reports.",
      };
    }

    // ----------------------------------------
    // Validate recipient
    // ----------------------------------------

    const recipient = recipientEmail?.trim();

    if (
      typeof recipient !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)
    ) {
      return {
        success: false,
        message: "Please enter a valid recipient email address.",
      };
    }

    // ----------------------------------------
    // Validate dates
    // ----------------------------------------

    const datePattern = /^\d{4}-\d{2}-\d{2}$/;

    if (
      typeof startDate !== "string" ||
      typeof endDate !== "string" ||
      !datePattern.test(startDate) ||
      !datePattern.test(endDate)
    ) {
      return {
        success: false,
        message: "Please select a valid report date range.",
      };
    }

    if (startDate > endDate) {
      return {
        success: false,
        message: "Start date cannot be after end date.",
      };
    }

    // ----------------------------------------
    // Validate report type
    // ----------------------------------------

    const allowedReportTypes = [
      "ALL",
      "SALES",
      "OPPORTUNITIES",
      "ESTIMATES",
      "COMMISSIONS",
    ];

    const normalizedReportType = String(reportType).toUpperCase();

    if (!allowedReportTypes.includes(normalizedReportType)) {
      return {
        success: false,
        message: "Invalid report type.",
      };
    }

    // ----------------------------------------
    // Enforce salesperson scope
    // ----------------------------------------

    let requestedSalesmanId = "ALL";
    let salesmanName = "All Salespeople";

    if (user.role === "SALESPERSON") {
      requestedSalesmanId = user.id;
      salesmanName = user.name || "My Report";
    } else if (salesmanId && salesmanId !== "ALL") {
      const selectedSalesperson = await prisma.user.findFirst({
        where: {
          id: salesmanId,
          role: "SALESPERSON",
          status: "ACTIVE",
        },
        select: {
          id: true,
          name: true,
        },
      });

      if (!selectedSalesperson) {
        return {
          success: false,
          message: "The selected salesperson is not available.",
        };
      }

      requestedSalesmanId = selectedSalesperson.id;
      salesmanName = selectedSalesperson.name;
    }

    // ----------------------------------------
    // Generate fresh report on the server
    // ----------------------------------------

    const report = await getReportData({
      startDate,
      endDate,
      reportType: normalizedReportType,
      salesmanId: requestedSalesmanId,
    });

    if (!report || report.success === false || !report.data) {
      return {
        success: false,
        message: report?.message || "Unable to generate the report.",
      };
    }

    // ----------------------------------------
    // Send report email
    // ----------------------------------------

    const emailSubject =
      typeof subject === "string" && subject.trim()
        ? subject.trim()
        : `Sales Tracker - ${normalizedReportType} Report (${startDate} to ${endDate})`;

    const result = await sendReportEmail({
      recipientEmail: recipient,
      subject: emailSubject,
      report,
      reportType: normalizedReportType,
      salesmanName,
    });

    return {
      success: true,
      message: "Report email sent successfully.",
      providerMessageId: result.providerMessageId,
    };
  } catch (error) {
    console.error("[Send Report Email Action Error]", error);

    return {
      success: false,
      message:
        error?.message || "Unable to send the report email. Please try again.",
    };
  }
}
