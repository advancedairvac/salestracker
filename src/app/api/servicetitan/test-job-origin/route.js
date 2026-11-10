
import { NextResponse } from "next/server";

import {
  serviceTitanRequest,
  getServiceTitanEmployee,
} from "@/lib/integrations/servicetitan";

// --------------------------------------------------
// API Diagnostic Helper
// --------------------------------------------------

async function testEndpoint(label, path, params = {}) {
  try {
    const data = await serviceTitanRequest(path, params);

    return {
      success: true,
      endpoint: path,
      data,
    };
  } catch (error) {
    return {
      success: false,
      endpoint: path,
      error: error.message,
    };
  }
}

// --------------------------------------------------
// Extract Employee IDs
// --------------------------------------------------

function extractEmployeeIds(value, ids = new Set()) {
  if (!value || typeof value !== "object") {
    return [...ids];
  }

  const employeeFields = [
    "employeeId",
    "agentId",
    "receivedById",
    "createdById",
    "bookedById",
    "modifiedById",
    "soldBy",
  ];

  if (Array.isArray(value)) {
    value.forEach((item) => extractEmployeeIds(item, ids));
    return [...ids];
  }

  Object.entries(value).forEach(([key, item]) => {
    if (
      employeeFields.includes(key) &&
      item !== null &&
      item !== undefined &&
      /^\d+$/.test(String(item)) &&
      Number(item) > 0
    ) {
      ids.add(String(item));
    }

    if (item && typeof item === "object") {
      extractEmployeeIds(item, ids);
    }
  });

  return [...ids];
}

// --------------------------------------------------
// GET: Job Origin Diagnostic
// --------------------------------------------------

export async function GET(request) {
  try {
    if (process.env.NODE_ENV !== "development") {
      return NextResponse.json(
        {
          success: false,
          message: "Diagnostic API is available only in development.",
        },
        { status: 404 },
      );
    }

    const { searchParams } = new URL(request.url);

    const jobId = searchParams.get("jobId");

    if (!jobId || !/^\d+$/.test(jobId)) {
      return NextResponse.json(
        {
          success: false,
          message: "Valid jobId is required.",
          example:
            "/api/servicetitan/test-job-origin?jobId=33480",
        },
        { status: 400 },
      );
    }

    // ----------------------------------------------
    // 1. Get Job Details
    // ----------------------------------------------

    const jobResult = await testEndpoint(
      "Job Details",
      `/jpm/v2/tenant/{tenant}/jobs/${jobId}`,
    );

    if (!jobResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Unable to fetch Job Details.",
          result: jobResult,
        },
        { status: 502 },
      );
    }

    const job = jobResult.data;

    const leadCallId = job.leadCallId;
    const bookingId = job.bookingId;

    // ----------------------------------------------
    // 2. Test Call API Candidates
    // ----------------------------------------------

    const callResults = [];

    if (leadCallId) {
      const callEndpoints = [
        {
          label: "Telecom Call Details",
          path: `/telecom/v2/tenant/{tenant}/calls/${leadCallId}`,
        },
        {
          label: "Telecom Calls List",
          path: "/telecom/v2/tenant/{tenant}/calls",
          params: {
            ids: leadCallId,
            page: 1,
            pageSize: 10,
          },
        },
        {
          label: "CRM Call Details",
          path: `/crm/v2/tenant/{tenant}/calls/${leadCallId}`,
        },
        {
          label: "CRM Calls List",
          path: "/crm/v2/tenant/{tenant}/calls",
          params: {
            ids: leadCallId,
            page: 1,
            pageSize: 10,
          },
        },
        {
          label: "CRM Lead Details",
          path: `/crm/v2/tenant/{tenant}/leads/${leadCallId}`,
        },
      ];

      for (const candidate of callEndpoints) {
        const result = await testEndpoint(
          candidate.label,
          candidate.path,
          candidate.params || {},
        );

        callResults.push({
          label: candidate.label,
          ...result,
        });
      }
    }

    // ----------------------------------------------
    // 3. Test Booking API
    // ----------------------------------------------

    let bookingResult = null;

    if (bookingId) {
      bookingResult = await testEndpoint(
        "Booking Details",
        `/crm/v2/tenant/{tenant}/bookings/${bookingId}`,
      );
    }

    // ----------------------------------------------
    // 4. Get Appointment Details
    // ----------------------------------------------

    const appointmentResult = await testEndpoint(
      "Job Appointments",
      "/jpm/v2/tenant/{tenant}/appointments",
      {
        jobId,
        page: 1,
        pageSize: 100,
      },
    );

    // ----------------------------------------------
    // 5. Get Appointment Assignments
    // ----------------------------------------------

    const assignmentResult = await testEndpoint(
      "Appointment Assignments",
      "/dispatch/v2/tenant/{tenant}/appointment-assignments",
      {
        jobId,
        page: 1,
        pageSize: 100,
      },
    );

    // ----------------------------------------------
    // 6. Collect Employee IDs
    // ----------------------------------------------

    const employeeSources = {
      job: jobResult,
      calls: callResults,
      booking: bookingResult,
      appointments: appointmentResult,
      assignments: assignmentResult,
    };

    const employeeIds = [
      ...new Set(
        extractEmployeeIds(employeeSources),
      ),
    ].slice(0, 30);

    // ----------------------------------------------
    // 7. Fetch Employee Details
    // ----------------------------------------------

    const employees = await Promise.all(
      employeeIds.map(async (employeeId) => {
        try {
          const data = await getServiceTitanEmployee(employeeId);

          return {
            success: true,
            employeeId,
            data,
          };
        } catch (error) {
          return {
            success: false,
            employeeId,
            error: error.message,
          };
        }
      }),
    );

    // ----------------------------------------------
    // 8. Final Response
    // ----------------------------------------------

    return NextResponse.json({
      success: true,
      diagnostic: "ServiceTitan Call & Job Origin Test",

      job: {
        id: job.id,
        jobNumber: job.jobNumber,
        customerId: job.customerId,
        status: job.jobStatus,
        total: job.total,
        createdById: job.createdById,
        leadCallId,
        bookingId,
        soldById: job.soldById,
      },

      summary: {
        jobFound: true,
        leadCallIdFound: Boolean(leadCallId),
        bookingIdFound: Boolean(bookingId),
        callEndpointsTested: callResults.length,
        successfulCallEndpoints: callResults.filter(
          (item) => item.success,
        ).length,
        discoveredEmployeeIds: employeeIds,
      },

      results: {
        calls: callResults,
        booking: bookingResult,
        appointments: appointmentResult,
        assignments: assignmentResult,
        employees,
      },

      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Job Origin Diagnostic Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      { status: 500 },
    );
  }
}
