
import { NextResponse } from "next/server";
import { getAllServiceTitanEmployees } from "@/lib/integrations/servicetitan";

export async function GET() {
  try {
    const employees = await getAllServiceTitanEmployees({
      pageSize: 100,
      maxPages: 100,
    });

    const formattedEmployees = employees.map((employee) => ({
      id: employee.id,
      name: employee.name || "",
      email: employee.email || "",
      firstName: employee.firstName || "",
      lastName: employee.lastName || "",
      role: employee.role || "",
      active: employee.active ?? false,
    }));

    return NextResponse.json({
      success: true,
      total: formattedEmployees.length,
      employees: formattedEmployees,
    });
  } catch (error) {
    console.error("ServiceTitan Employee API Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to fetch employees.",
      },
      { status: 500 },
    );
  }
}
