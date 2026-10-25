import { NextResponse } from "next/server";
import { getQuickBooksAccessToken } from "@/lib/quickbooks-token";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const environment = process.env.QB_ENVIRONMENT || "sandbox";

    if (!["sandbox", "production"].includes(environment)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid QuickBooks environment configuration.",
        },
        { status: 500 },
      );
    }

    const connection = await prisma.quickBooksConnection.findFirst({
      where: { environment },
      orderBy: { updatedAt: "desc" },
      select: {
        realmId: true,
        environment: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!connection) {
      return NextResponse.json(
        {
          success: false,
          connected: false,
          environment,
          message: `No QuickBooks ${environment} company connected.`,
        },
        { status: 404 },
      );
    }

    const { realmId } = connection;
    const accessToken = await getQuickBooksAccessToken(realmId);

    const apiBaseUrl =
      environment === "production"
        ? "https://quickbooks.api.intuit.com"
        : "https://sandbox-quickbooks.api.intuit.com";

    const apiUrl = new URL(
      `/v3/company/${encodeURIComponent(realmId)}/companyinfo/${encodeURIComponent(realmId)}`,
      apiBaseUrl,
    );

    apiUrl.searchParams.set("minorversion", "75");

    const apiResponse = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const data = await apiResponse.json().catch(() => null);

    if (!apiResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          connected: true,
          environment,
          message: "QuickBooks company information request failed.",
          status: apiResponse.status,
        },
        { status: 502 },
      );
    }

    const company = data?.CompanyInfo;

    if (!company) {
      return NextResponse.json(
        {
          success: false,
          connected: true,
          environment,
          message: "QuickBooks did not return company information.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      success: true,
      connected: true,
      apiVerified: true,
      environment,
      realmId,
      connectedAt: connection.createdAt,
      lastUpdatedAt: connection.updatedAt,
      company: {
        companyName: company.CompanyName ?? null,
        legalName: company.LegalName ?? null,
        companyAddress: company.CompanyAddr ?? null,
        legalAddress: company.LegalAddr ?? null,
        phone: company.PrimaryPhone?.FreeFormNumber ?? null,
        email: company.Email?.Address ?? null,
        website: company.WebAddr?.URI ?? null,
        country: company.Country ?? null,
        fiscalYearStartMonth: company.FiscalYearStartMonth ?? null,
        companyStartDate: company.CompanyStartDate ?? null,
        supportedLanguages: company.SupportedLanguages ?? null,
        timeZone: company.TimeZone ?? null,
      },
      message: `QuickBooks ${environment} company verified successfully.`,
    });
  } catch (error) {
    console.error(
      "[QuickBooks] Company verification failed:",
      error?.message || "Unknown error",
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Company verification failed. Check the QuickBooks connection and server configuration.",
      },
      { status: 500 },
    );
  }
}
