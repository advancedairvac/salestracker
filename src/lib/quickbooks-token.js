
import OAuthClient from "intuit-oauth";
import { prisma } from "@/lib/prisma";
import { decryptToken, encryptToken } from "@/lib/quickbooks-crypto";

function createOAuthClient() {
  return new OAuthClient({
    clientId: process.env.QB_CLIENT_ID,
    clientSecret: process.env.QB_CLIENT_SECRET,
    environment: "sandbox",
    redirectUri: process.env.QB_REDIRECT_URI,
    logging: false,
  });
}

export async function getQuickBooksAccessToken(realmId) {
  const connection = await prisma.quickBooksConnection.findUnique({
    where: { realmId },
  });

  if (!connection) {
    throw new Error("QuickBooks company is not connected.");
  }

  // Refresh slightly early to avoid using a token that is about to expire.
  const refreshBeforeExpiry = 2 * 60 * 1000;
  const accessTokenStillValid =
    connection.accessTokenExpiresAt.getTime() >
    Date.now() + refreshBeforeExpiry;

  if (accessTokenStillValid) {
    return decryptToken(connection.accessTokenEncrypted);
  }

  if (
    connection.refreshTokenExpiresAt &&
    connection.refreshTokenExpiresAt.getTime() <= Date.now()
  ) {
    throw new Error("QuickBooks refresh token has expired. Reconnect required.");
  }

  const oauthClient = createOAuthClient();
  const currentRefreshToken = decryptToken(
    connection.refreshTokenEncrypted
  );

  const authResponse = await oauthClient.refreshUsingToken(
    currentRefreshToken
  );
  const token = authResponse.getToken();

  if (!token.access_token) {
    throw new Error("QuickBooks did not return a new access token.");
  }

  // Some responses may omit a replacement refresh token.
  const nextRefreshToken =
    token.refresh_token || currentRefreshToken;

  const nextRefreshExpiry = token.x_refresh_token_expires_in
    ? new Date(
        Date.now() + Number(token.x_refresh_token_expires_in) * 1000
      )
    : connection.refreshTokenExpiresAt;

  const updated = await prisma.quickBooksConnection.update({
    where: { realmId },
    data: {
      accessTokenEncrypted: encryptToken(token.access_token),
      refreshTokenEncrypted: encryptToken(nextRefreshToken),
      accessTokenExpiresAt: new Date(
        Date.now() + Number(token.expires_in || 3600) * 1000
      ),
      refreshTokenExpiresAt: nextRefreshExpiry,
    },
  });

  return decryptToken(updated.accessTokenEncrypted);
}
