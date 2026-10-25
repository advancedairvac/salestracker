import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getQuickBooksClient } from "@/lib/quickbooks";
import { decryptToken } from "@/lib/quickbooks-crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  const url = new URL(request.url);
  const origin = request.headers.get("origin");

  // Reject cross-origin requests.
  if (!origin || origin !== url.origin) {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid request origin.",
      },
      { status: 403 },
    );
  }

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

    const formData = await request.formData();
    const realmId = formData.get("realmId");

    if (typeof realmId !== "string" || !realmId.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "A valid QuickBooks company is required.",
        },
        { status: 400 },
      );
    }

    const connection = await prisma.quickBooksConnection.findUnique({
      where: {
        realmId_environment: {
          realmId: realmId.trim(),
          environment,
        },
      },
    });

    if (!connection) {
      return NextResponse.json(
        {
          success: false,
          message: `No QuickBooks ${environment} connection found.`,
        },
        { status: 404 },
      );
    }

    const accessToken = decryptToken(connection.accessTokenEncrypted);

    const refreshToken = decryptToken(connection.refreshTokenEncrypted);

    const oauthClient = getQuickBooksClient();

    // Revoke the stored QuickBooks OAuth authorization.
    await oauthClient.revoke({
      token_type: "bearer",
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: Math.max(
        0,
        Math.floor(
          (connection.accessTokenExpiresAt.getTime() - Date.now()) / 1000,
        ),
      ),
      x_refresh_token_expires_in: connection.refreshTokenExpiresAt
        ? Math.max(
            0,
            Math.floor(
              (connection.refreshTokenExpiresAt.getTime() - Date.now()) / 1000,
            ),
          )
        : 0,
      createdAt: Date.now(),
    });

    // Delete the local connection only after revocation succeeds.
    await prisma.quickBooksConnection.delete({
      where: {
        realmId_environment: {
          realmId: realmId.trim(),
          environment,
        },
      },
    });

    return NextResponse.json({
      success: true,
      disconnected: true,
      environment,
      message:
        "QuickBooks authorization was revoked and the local connection was removed.",
    });
  } catch (error) {
    console.error(
      "[QuickBooks] Disconnect failed:",
      error?.message || "Unknown error",
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "QuickBooks disconnection could not be completed. The local connection was not intentionally deleted.",
      },
      { status: 502 },
    );
  }
}
