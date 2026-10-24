
import { NextResponse } from "next/server";
import { getQuickBooksAccessToken } from "@/lib/quickbooks-token";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  try {
    const connection = await prisma.quickBooksConnection.findFirst({
      orderBy: { updatedAt: "desc" },
      select: { realmId: true },
    });

    if (!connection) {
      return NextResponse.json(
        { success: false, message: "No QuickBooks company connected." },
        { status: 404 }
      );
    }

    const { realmId } = connection;
    const accessToken = await getQuickBooksAccessToken(realmId);

    const apiResponse = await fetch(
      `https://sandbox-quickbooks.api.intuit.com/v3/company/${encodeURIComponent(
        realmId
      )}/companyinfo/${encodeURIComponent(realmId)}?minorversion=75`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
        cache: "no-store",
      }
    );

    if (!apiResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          message: "QuickBooks API request failed.",
          status: apiResponse.status,
        },
        { status: 502 }
      );
    }

    const data = await apiResponse.json();
    const company = data?.CompanyInfo;

    return NextResponse.json({
      success: Boolean(company),
      companyName: company?.CompanyName ?? null,
      message: company
        ? "QuickBooks API request successful."
        : "Company information was not returned.",
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message:
          "QuickBooks company lookup failed. Check the connection and server configuration.",
      },
      { status: 500 }
    );
  }
}
