
import { prisma } from "@/lib/prisma";
import { getQuickBooksAccessToken } from "@/lib/quickbooks-token";

const ALLOWED_RESOURCES = {
  customers: "Customer",
  vendors: "Vendor",
  items: "Item",
  invoices: "Invoice",
  estimates: "Estimate",
  salesreceipts: "SalesReceipt",
  payments: "Payment",
  bills: "Bill",
  purchases: "Purchase",
  accounts: "Account",
  employees: "Employee",
  creditmemos: "CreditMemo",
  purchaseorders: "PurchaseOrder",
  journalentries: "JournalEntry",
  taxcodes: "TaxCode",
};

export async function getQuickBooksConnection() {
  const environment = process.env.QB_ENVIRONMENT || "sandbox";

  if (!["sandbox", "production"].includes(environment)) {
    throw new Error("Invalid QuickBooks environment.");
  }

  const connection = await prisma.quickBooksConnection.findFirst({
    where: { environment },
    orderBy: { updatedAt: "desc" },
    select: {
      realmId: true,
      environment: true,
    },
  });

  if (!connection) {
    throw new Error(
      `No QuickBooks ${environment} company connected.`
    );
  }

  return connection;
}

export async function queryQuickBooksResource(resource, options = {}) {
  const entity = ALLOWED_RESOURCES[resource?.toLowerCase()];

  if (!entity) {
    throw new Error("Unsupported QuickBooks resource.");
  }

  const connection = await getQuickBooksConnection();

  const accessToken = await getQuickBooksAccessToken(
    connection.realmId
  );

  const baseUrl =
    connection.environment === "production"
      ? "https://quickbooks.api.intuit.com"
      : "https://sandbox-quickbooks.api.intuit.com";

  const startPosition = Math.max(
    1,
    Number.parseInt(options.startPosition, 10) || 1
  );

  const maxResults = Math.min(
    100,
    Math.max(1, Number.parseInt(options.maxResults, 10) || 50)
  );

  const query =
    `SELECT * FROM ${entity} ` +
    `STARTPOSITION ${startPosition} MAXRESULTS ${maxResults}`;

  const url = new URL(
    `/v3/company/${encodeURIComponent(connection.realmId)}/query`,
    baseUrl
  );

  url.searchParams.set("query", query);
  url.searchParams.set("minorversion", "75");

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(
      data?.Fault?.Error?.[0]?.Detail ||
        data?.Fault?.Error?.[0]?.Message ||
        `QuickBooks API returned HTTP ${response.status}.`
    );

    error.status = response.status;
    throw error;
  }

  const queryResponse = data?.QueryResponse || {};
  const records = queryResponse[entity] || [];

  return {
    success: true,
    resource: entity,
    environment: connection.environment,
    realmId: connection.realmId,
    records,
    totalRecords: records.length,
    startPosition,
    maxResults,
    raw: data,
  };
}
