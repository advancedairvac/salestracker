import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getQuickBooksClient } from "@/lib/quickbooks";
import { encryptToken } from "@/lib/quickbooks-crypto";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request) {
  const url = new URL(request.url);
  const cookieStore = await cookies();

  const expectedState = cookieStore.get("qb_oauth_state")?.value;
  const receivedState = url.searchParams.get("state");
  const realmId = url.searchParams.get("realmId");
  const code = url.searchParams.get("code");
  const oauthError = url.searchParams.get("error");

  const fail = (message, status = 400) => {
    const response = NextResponse.json({ success: false, message }, { status });
    response.cookies.delete("qb_oauth_state");
    return response;
  };

  if (oauthError) {
    return fail("QuickBooks authorization was denied or cancelled.");
  }

  if (!expectedState || !receivedState || expectedState !== receivedState) {
    return fail("Invalid OAuth state. Please connect again.");
  }

  if (!code || !realmId) {
    return fail(
      "QuickBooks did not return the required authorization details.",
    );
  }

  try {
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

    const accessTokenExpiresAt = new Date(Date.now() + token.expires_in * 1000);

    const refreshTokenExpiresAt = new Date(
      Date.now() + token.x_refresh_token_expires_in * 1000,
    );

    await prisma.quickBooksConnection.upsert({
      where: { realmId },
      create: {
        realmId,
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

    // Verify access by requesting the Sandbox company information.
    const companyResponse = await fetch(
      `https://sandbox-quickbooks.api.intuit.com/v3/company/${encodeURIComponent(
        realmId,
      )}/companyinfo/${encodeURIComponent(realmId)}`,
      {
        headers: {
          Authorization: `Bearer ${token.access_token}`,
          Accept: "application/json",
        },
        cache: "no-store",
      },
    );

    if (!companyResponse.ok) {
      const response = NextResponse.json({
        success: true,
        tokenStored: true,
        apiVerified: false,
        message:
          "Authorization succeeded and tokens were stored securely, but the company API check failed.",
      });

      response.cookies.delete("qb_oauth_state");
      return response;
    }

    const companyData = await companyResponse.json();
    const companyInfo = companyData?.CompanyInfo;

    const response = NextResponse.json({
      success: true,
      tokenStored: true,
      apiVerified: Boolean(companyInfo),
      companyName: companyInfo?.CompanyName ?? null,
      message: companyInfo
        ? "QuickBooks Sandbox API verification successful."
        : "Token stored, but company information was not returned.",
    });

    response.cookies.delete("qb_oauth_state");
    return response;
  } catch {
    // Do not log or return tokens or sensitive OAuth callback details.
    return fail(
      "QuickBooks processing failed. Check server configuration and try reconnecting.",
      500,
    );
  }
}
