import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getQuickBooksClient } from "@/lib/quickbooks";
import { encryptToken } from "@/lib/quickbooks-crypto";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function redirectToTesting(request, status, extra = {}) {
  const destination = new URL("/admin/quickbooks", request.url);

  destination.searchParams.set("qb_status", status);

  for (const [key, value] of Object.entries(extra)) {
    if (value !== null && value !== undefined) {
      destination.searchParams.set(key, String(value));
    }
  }

  const response = NextResponse.redirect(destination);
  response.cookies.delete("qb_oauth_state");

  return response;
}

export async function GET(request) {
  const url = new URL(request.url);
  const cookieStore = await cookies();

  const expectedState = cookieStore.get("qb_oauth_state")?.value;
  const receivedState = url.searchParams.get("state");
  const realmId = url.searchParams.get("realmId");
  const code = url.searchParams.get("code");
  const oauthError = url.searchParams.get("error");

  if (oauthError) {
    return redirectToTesting(request, "authorization-denied");
  }

  if (!expectedState || !receivedState || expectedState !== receivedState) {
    return redirectToTesting(request, "invalid-state");
  }

  if (!code || !realmId) {
    return redirectToTesting(request, "missing-authorization-details");
  }

  try {
    const environment = process.env.QB_ENVIRONMENT || "sandbox";

    if (!["sandbox", "production"].includes(environment)) {
      throw new Error("Invalid QuickBooks environment configuration.");
    }

    const client = getQuickBooksClient();
    const authResponse = await client.createToken(request.url);
    const token = authResponse.getToken();

    if (
      !token.access_token ||
      !token.refresh_token ||
      !token.expires_in ||
      !token.x_refresh_token_expires_in
    ) {
      throw new Error("Required token fields are missing.");
    }

    const accessTokenExpiresAt = new Date(
      Date.now() + Number(token.expires_in) * 1000,
    );

    const refreshTokenExpiresAt = new Date(
      Date.now() + Number(token.x_refresh_token_expires_in) * 1000,
    );

    await prisma.quickBooksConnection.upsert({
      where: {
        realmId_environment: {
          realmId,
          environment,
        },
      },
      create: {
        realmId,
        environment,
        accessTokenEncrypted: encryptToken(token.access_token),
        refreshTokenEncrypted: encryptToken(token.refresh_token),
        accessTokenExpiresAt,
        refreshTokenExpiresAt,
      },
      update: {
        accessTokenEncrypted: encryptToken(token.access_token),
        refreshTokenEncrypted: encryptToken(token.refresh_token),
        accessTokenExpiresAt,
        refreshTokenExpiresAt,
      },
    });

    const apiBaseUrl =
      environment === "production"
        ? "https://quickbooks.api.intuit.com"
        : "https://sandbox-quickbooks.api.intuit.com";

    const companyUrl = new URL(
      `/v3/company/${encodeURIComponent(realmId)}/companyinfo/${encodeURIComponent(realmId)}`,
      apiBaseUrl,
    );

    companyUrl.searchParams.set("minorversion", "75");

    const companyResponse = await fetch(companyUrl, {
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!companyResponse.ok) {
      return redirectToTesting(request, "connected-unverified", {
        environment,
      });
    }

    const companyData = await companyResponse.json();
    const companyInfo = companyData?.CompanyInfo;

    if (!companyInfo) {
      return redirectToTesting(request, "connected-unverified", {
        environment,
      });
    }

    return redirectToTesting(request, "connected", {
      environment,
    });
  } catch (error) {
    console.error(
      "[QuickBooks] OAuth callback failed:",
      error?.message || "Unknown error",
    );

    return redirectToTesting(request, "connection-failed");
  }
}
