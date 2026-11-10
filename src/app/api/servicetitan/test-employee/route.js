import { serviceTitanRequest } from "@/lib/integrations/servicetitan";

export async function GET() {
  const employeeId = 34079;

  const tests = [
    {
      name: "employeeDetails",
      path: `/settings/v2/tenant/{tenant}/employees/${employeeId}`,
    },
    {
      name: "employeeList",
      path: "/settings/v2/tenant/{tenant}/employees",
      params: {
        page: 1,
        pageSize: 100,
        ids: employeeId,
      },
    },
  ];

  const results = {};

  for (const test of tests) {
    try {
      const response = await serviceTitanRequest(test.path, test.params || {});

      const data = response.data ?? response;

      results[test.name] = {
        success: true,
        responseKeys: Object.keys(data),

        employee: {
          id: data.id ?? null,
          name: data.name ?? null,
          email: data.email ?? null,
          firstName: data.firstName ?? null,
          lastName: data.lastName ?? null,
          active: data.active ?? null,
          role: data.role ?? null,
        },

        rawResponse: data,
      };
    } catch (error) {
      results[test.name] = {
        success: false,
        error: error.message,
      };
    }
  }

  return Response.json({
    success: true,
    testedEmployeeId: employeeId,
    results,
  });
}
